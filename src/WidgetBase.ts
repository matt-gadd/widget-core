import { Evented, BaseEventedEvents } from '@dojo/core/Evented';
import { assign } from '@dojo/core/lang';
import { EventedListenerOrArray } from '@dojo/interfaces/bases';
import { Handle } from '@dojo/interfaces/core';
import { VNode } from '@dojo/interfaces/vdom';
import Map from '@dojo/shim/Map';
import Promise from '@dojo/shim/Promise';
import Set from '@dojo/shim/Set';
import WeakMap from '@dojo/shim/WeakMap';
import { v, registry, isWNode } from './d';
import {
	DNode,
	WidgetConstructor,
	WidgetProperties,
	WidgetBaseInterface,
	PropertyChangeRecord,
	PropertiesChangeRecord,
	PropertiesChangeEvent
} from './interfaces';
import WidgetRegistry, { WIDGET_BASE_TYPE } from './WidgetRegistry';

/**
 * Widget cache wrapper for instance management
 */
interface WidgetCacheWrapper {
	child: WidgetBaseInterface<WidgetProperties>;
	widgetConstructor: WidgetConstructor;
	used: boolean;
}

export const enum DiffType {
	CUSTOM = 1,
	IGNORE,
	REFERENCE,
	SHALLOW,
	AUTO
}

/**
 * Diff property configuration
 */
interface DiffPropertyConfig {
	propertyName: string;
	diffType: DiffType;
	diffFunction?: Function;
}

export interface WidgetBaseEvents<P extends WidgetProperties> extends BaseEventedEvents {
	(type: 'properties:changed', handler: EventedListenerOrArray<WidgetBase<P>, PropertiesChangeEvent<WidgetBase<P>, P>>): Handle;
}

const decoratorMap = new Map<Function, Map<string, any[]>>();

/**
 * Decorator that can be used to register a function to run as an aspect to `render`
 */
export function afterRender(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	target.addDecorator('afterRender', target[propertyKey]);
}

/**
 * Decorator that can be used to register a function as a specific property diff
 *
 * @param propertyName The name of the property of which the diff function is applied
 */
export function diffProperty(propertyName: string, diffType = DiffType.CUSTOM) {
	return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
		if (diffType === DiffType.CUSTOM && propertyKey && descriptor) {
			target.addDecorator('diffProperty', { propertyName, diffType, diffFunction: target[propertyKey] });
		}
		else if (diffType && !propertyKey && !descriptor) {
			target.prototype.addDecorator('diffProperty', { propertyName, diffType });
		}
	};
}

/**
 * Decorator used to register listeners to the `properties:changed` event.
 */
export function onPropertiesChanged(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	target.addDecorator('onPropertiesChanged', target[propertyKey]);
}

function isObjectOrArray(value: any): boolean {
	return Object.prototype.toString.call(value) === '[object Object]' || Array.isArray(value);
}

function diffIgnore(previousProperty: any, newProperty: any): PropertyChangeRecord {
	return {
		changed: false,
		value: newProperty
	};
}

function diffCustom(previousProperty: any, newProperty: any, scope: any, diffFunction?: Function): PropertyChangeRecord {
	if (!diffFunction) {
		return {
			changed: false,
			value: newProperty
		};
	}
	return diffFunction.call(scope, previousProperty, newProperty);
}

function diffReference(previousProperty: any, newProperty: any): PropertyChangeRecord {
	return {
		changed: previousProperty !== newProperty,
		value: newProperty
	};
}

function diffShallow(previousProperty: any, newProperty: any): PropertyChangeRecord {
	let changed = false;

	const validOldProperty = previousProperty && isObjectOrArray(previousProperty);
	const validNewProperty = newProperty && isObjectOrArray(newProperty);

	if (!validOldProperty || !validNewProperty) {
		return {
			changed: true,
			value: newProperty
		};
	}

	const previousKeys = Object.keys(previousProperty);
	const newKeys = Object.keys(newProperty);

	if (previousKeys.length !== newKeys.length) {
		changed = true;
	}
	else {
		changed = newKeys.some((key) => {
			return newProperty[key] !== previousProperty[key];
		});
	}
	return {
		changed,
		value: newProperty
	};
}

function diff(diffType: DiffType, previousProperty: any, newProperty: any) {
	let result;
	switch (diffType) {
		case DiffType.IGNORE:
			result = diffIgnore(previousProperty, newProperty);
		break;
		case DiffType.REFERENCE:
			result = diffReference(previousProperty, newProperty);
		break;
		case DiffType.SHALLOW:
			result = diffShallow(previousProperty, newProperty);
		break;
		case DiffType.AUTO:
			if (typeof newProperty === 'function') {
				result = diffIgnore(previousProperty, newProperty);
			}
			else if (isObjectOrArray(newProperty)) {
				result = diffShallow(previousProperty, newProperty);
			}
			else {
				result = diffReference(previousProperty, newProperty);
			}
		break;
		default:
			result = {
				changed: true,
				value: newProperty
			};
	}
	return result;
}

/**
 * Main widget base for all widgets to extend
 */
export class WidgetBase<P extends WidgetProperties> extends Evented implements WidgetBaseInterface<P> {

	/**
	 * static identifier
	 */
	static _type: symbol = WIDGET_BASE_TYPE;

	/**
	 * children array
	 */
	private  _children: DNode[];

	/**
	 * marker indicating if the widget requires a render
	 */
	private dirty: boolean;

	/**
	 * cachedVNode from previous render
	 */
	private cachedVNode?: VNode | string;

	on: WidgetBaseEvents<P>;

	/**
	 * internal widget properties
	 */
	private  _properties: P;

	/**
	 * properties from the previous render
	 */
	private previousProperties: P & { [index: string]: any };

	/**
	 * Map constructor labels to widget constructor
	 */
	private initializedConstructorMap: Map<string, Promise<WidgetConstructor>>;

	/**
	 * cached chldren map for instance management
	 */
	private cachedChildrenMap: Map<string | Promise<WidgetConstructor> | WidgetConstructor, WidgetCacheWrapper[]>;

	/**
	 * map of specific property diff functions
	 */
	private diffPropertyFunctionMap: Map<string, string>;

	private _decoratorCache: Map<string, any[]>;

	/**
	 * set of render decorators
	 */
	private renderDecorators: Set<string>;

	/**
	 * Map of functions properties for the bound function
	 */
	private bindFunctionPropertyMap: WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>;

	/**
	 * Internal widget registry
	 */
	protected registry: WidgetRegistry | undefined;

	/**
	 * @constructor
	 */
	constructor() {
		super({});

		this._children = [];
		this._decoratorCache = new Map<string, any[]>();
		this._properties = <P> {};
		this.previousProperties = <P> {};
		this.initializedConstructorMap = new Map<string, Promise<WidgetConstructor>>();
		this.cachedChildrenMap = new Map<string | Promise<WidgetConstructor> | WidgetConstructor, WidgetCacheWrapper[]>();
		this.diffPropertyFunctionMap = new Map<string, string>();
		this.renderDecorators = new Set<string>();
		this.bindFunctionPropertyMap = new WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>();

		this.own(this.on('properties:changed', (evt) => {
			this.dirty = true;

			const propertiesChangedListeners = this.getDecorator('onPropertiesChanged') || [];
			propertiesChangedListeners.forEach((propertiesChangedFunction) => {
				propertiesChangedFunction.call(this, evt);
			});
		}));
	}

	public get properties(): Readonly<P> {
		return this._properties;
	}

	public setProperties(properties: P): void {
		const diffPropertyResults: { [index: string]: PropertyChangeRecord } = {};
		const diffPropertyChangedKeys: string[] = [];

		this.bindFunctionProperties(properties);

		const registeredDiffPropertyConfigs: DiffPropertyConfig[] = this.getDecorator('diffProperty') || [];

		registeredDiffPropertyConfigs.forEach(({ propertyName, diffFunction, diffType }) => {

			const previousProperty = this.previousProperties[propertyName];
			const newProperty = (<any> properties)[propertyName];

			let result;

			if (diffType === DiffType.CUSTOM) {
				result = diffCustom(previousProperty, newProperty, this, diffFunction);
			}
			else {
				result = diff(diffType, previousProperty, newProperty);
			}

			diffPropertyResults[propertyName] = result.value;

			if (result.changed) {
				diffPropertyChangedKeys.push(propertyName);
			}

			// always remove the property from further processing;
			delete (<any> properties)[propertyName];
			delete this.previousProperties[propertyName];
		});

		const diffPropertiesResult = this.diffProperties(this.previousProperties, properties);
		this._properties = assign(diffPropertiesResult.properties, diffPropertyResults);

		const changedPropertyKeys = [...diffPropertiesResult.changedKeys, ...diffPropertyChangedKeys];

		if (changedPropertyKeys.length) {
			this.emit({
				type: 'properties:changed',
				target: this,
				properties: this.properties,
				changedPropertyKeys
			});
		}
		this.previousProperties = this.properties;
	}

	public get children(): DNode[] {
		return this._children;
	}

	public setChildren(children: DNode[]): void {
		this.dirty = true;
		this._children = children;
		this.emit({
			type: 'widget:children',
			target: this
		});
	}

	public diffProperties(previousProperties: P & { [index: string]: any }, newProperties: P & { [index: string]: any }): PropertiesChangeRecord<P> {
		return Object.keys(newProperties).reduce((propertiesChangeRecord: any, propertyKey: string): PropertiesChangeRecord<P> => {
			const result = diff(DiffType.AUTO, previousProperties[propertyKey], newProperties[propertyKey]);
			if (result.changed) {
				propertiesChangeRecord.changedKeys.push(propertyKey);
			}
			propertiesChangeRecord.properties[propertyKey] = result.value;
			return propertiesChangeRecord;
		}, { changedKeys: [], properties: {} });
	}

	public render(): DNode {
		return v('div', {}, this.children);
	}

	public __render__(): VNode | string | null {
		if (this.dirty || !this.cachedVNode) {
			this.dirty = false;
			let dNode = this.render();
			const afterRenders = this.getDecorator('afterRender') || [];
			afterRenders.forEach((afterRenderFunction: Function) => {
				dNode = afterRenderFunction.call(this, dNode);
			});
			const widget = this.dNodeToVNode(dNode);
			this.manageDetachedChildren();
			if (widget) {
				this.cachedVNode = widget;
			}
			return widget;
		}
		return this.cachedVNode;
	}

	public invalidate(): void {
		this.dirty = true;
		this.emit({
			type: 'invalidated',
			target: this
		});
	}

	/**
	 * Binds unbound property functions to the specified `bind` property
	 *
	 * @param properties properties to check for functions
	 */
	private bindFunctionProperties(properties: P & { [index: string]: any }): void {
		Object.keys(properties).forEach((propertyKey) => {
			const property = properties[propertyKey];
			const bind = properties.bind;

			if (typeof property === 'function') {
				const bindInfo = this.bindFunctionPropertyMap.get(property) || {};
				let { boundFunc, scope } = bindInfo;

				if (!boundFunc || scope !== bind) {
					boundFunc = property.bind(bind);
					this.bindFunctionPropertyMap.set(property, { boundFunc, scope: bind });
				}
				properties[propertyKey] = boundFunc;
			}
		});
	}

	/**
	 * Function to add decorators to WidgetBase
	 *
	 * @param decoratorKey The key of the decorator
	 * @param value The value of the decorator
	 */
	protected addDecorator(decoratorKey: string, value: any): void {
		value = Array.isArray(value) ? value : [ value ];

		let decoratorList = decoratorMap.get(this.constructor);
		if (!decoratorList) {
			decoratorList = new Map<string, any[]>();
			decoratorMap.set(this.constructor, decoratorList);
		}

		let specificDecoratorList = decoratorList.get(decoratorKey);
		if (!specificDecoratorList) {
			specificDecoratorList = [];
			decoratorList.set(decoratorKey, specificDecoratorList);
		}

		specificDecoratorList.push(...value);
	}

	/**
	 * Function to build the list of decorators from the global decorator map.
	 *
	 * @param decoratorKey  The key of the decorator
	 * @return An array of decorator values
	 * @private
	 */
	private _buildDecoratorList(decoratorKey: string): any[] {
		const allDecorators = [];

		let constructor = this.constructor;

		while (constructor) {
			const instanceMap = decoratorMap.get(constructor);
			if (instanceMap) {
				const decorators = instanceMap.get(decoratorKey);

				if (decorators) {
					allDecorators.unshift(...decorators);
				}
			}

			constructor = Object.getPrototypeOf(constructor);
		}

		return allDecorators;
	}

	/**
	 * Function to retrieve decorator values
	 *
	 * @param decoratorKey The key of the decorator
	 * @returns An array of decorator values
	 */
	protected getDecorator(decoratorKey: string): any[] {
		let allDecorators = this._decoratorCache.get(decoratorKey);

		if (allDecorators !== undefined) {
			return allDecorators;
		}

		allDecorators = this._buildDecoratorList(decoratorKey);

		this._decoratorCache.set(decoratorKey, allDecorators);

		return allDecorators;
	}

	/**
	 * Returns the constructor from the registry for the specified label. First checks a local registry passed via
	 * properties, if no local registry or the constructor is not found fallback to the global registry
	 *
	 * @param widgetLabel the label to look up in the registry
	 */
	private getFromRegistry(widgetLabel: string): Promise<WidgetConstructor> | WidgetConstructor | null {
		if (this.registry && this.registry.has(widgetLabel)) {
			return this.registry.get(widgetLabel);
		}
		return registry.get(widgetLabel);
	}

	/**
	 * Process a structure of DNodes into VNodes, string or null. `null` results are filtered.
	 *
	 * @param dNode the dnode to process
	 * @returns a VNode, string or null
	 */
	private dNodeToVNode(dNode: DNode): VNode | string | null {

		if (typeof dNode === 'string' || dNode === null) {
			return dNode;
		}

		if (isWNode(dNode)) {
			const { children, properties = {} } = dNode;
			const { key } = properties;

			let { widgetConstructor } = dNode;
			let child: WidgetBaseInterface<WidgetProperties>;

			if (typeof widgetConstructor === 'string') {
				const item = this.getFromRegistry(widgetConstructor);

				if (item instanceof Promise) {
					if (item && !this.initializedConstructorMap.has(widgetConstructor)) {
						const promise = item.then((ctor) => {
							this.invalidate();
							return ctor;
						});
						this.initializedConstructorMap.set(widgetConstructor, promise);
					}
					return null;
				}
				else if (item === null) {
					console.warn(`Unable to render unknown widget constructor ${widgetConstructor}`);
					return null;
				}
				widgetConstructor = item;
			}

			const childrenMapKey = key || widgetConstructor;
			let cachedChildren = this.cachedChildrenMap.get(childrenMapKey) || [];
			let cachedChild: WidgetCacheWrapper | undefined;
			cachedChildren.some((cachedChildWrapper) => {
				if (cachedChildWrapper.widgetConstructor === widgetConstructor && !cachedChildWrapper.used) {
					cachedChild = cachedChildWrapper;
					return true;
				}
				return false;
			});

			if (!properties.hasOwnProperty('bind')) {
				properties.bind = this;
			}

			if (cachedChild) {
				child = cachedChild.child;
				child.setProperties(properties);
				cachedChild.used = true;
			}
			else {
				child = new widgetConstructor();
				child.setProperties(properties);
				child.own(child.on('invalidated', () => {
					this.invalidate();
				}));
				cachedChildren = [...cachedChildren, { child, widgetConstructor, used: true }];
				this.cachedChildrenMap.set(childrenMapKey, cachedChildren);
				this.own(child);
			}
			if (!key && cachedChildren.length > 1) {
				const errorMsg = 'It is recommended to provide a unique `key` property when using the same widget multiple times';
				console.warn(errorMsg);
				this.emit({ type: 'error', target: this, error: new Error(errorMsg) });
			}

			if (Array.isArray(children)) {
				child.setChildren(children);
			}
			return child.__render__();
		}

		dNode.vNodes = dNode.children
		.filter((child) => child !== null)
		.map((child: DNode) => {
			return this.dNodeToVNode(child);
		});

		return dNode.render({ bind: this });
	}

	/**
	 * Manage widget instances after render processing
	 */
	private manageDetachedChildren(): void {
		this.cachedChildrenMap.forEach((cachedChildren, key) => {
			const filterCachedChildren = cachedChildren.filter((cachedChild) => {
				if (cachedChild.used) {
					cachedChild.used = false;
					return true;
				}
				cachedChild.child.destroy();
				return false;
			});
			this.cachedChildrenMap.set(key, filterCachedChildren);
		});
	}
}

export default WidgetBase;
