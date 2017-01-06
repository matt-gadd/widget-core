import { isComposeFactory } from 'dojo-compose/compose';
import createStateful from 'dojo-compose/bases/createStateful';
import {
	DNode,
	WNode,
	Widget,
	WidgetMixin,
	WidgetState,
	WidgetOptions,
	WidgetProperties,
	WidgetFactory,
	FactoryRegistryItem
} from './interfaces';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { assign } from 'dojo-core/lang';
import WeakMap from 'dojo-shim/WeakMap';
import Promise from 'dojo-shim/Promise';
import Map from 'dojo-shim/Map';
import { v, registry } from './d';
import FactoryRegistry from './FactoryRegistry';
import createVNodeEvented from './mixins/createVNodeEvented';
import shallowPropertyComparisonMixin from './mixins/shallowPropertyComparisonMixin';

interface WidgetInternalState {
	children: DNode[];
	readonly id: string;
	dirty: boolean;
	widgetClasses: string[];
	cachedVNode?: VNode | string;
	factoryRegistry: FactoryRegistry;
	initializedFactoryMap: Map<string, Promise<WidgetFactory>>;
	previousProperties: WidgetProperties;
	historicChildrenMap: Map<string | Promise<WidgetFactory> | WidgetFactory, Widget<WidgetState, WidgetProperties>>;
	currentChildrenMap: Map<string | Promise<WidgetFactory> | WidgetFactory, Widget<WidgetState, WidgetProperties>>;
};

/**
 * Internal state map for widget instances
 */
const widgetInternalStateMap = new WeakMap<Widget<WidgetState, WidgetProperties>, WidgetInternalState>();

/**
 * The counter for generating a unique ID
 */
let widgetCount = 0;

function generateID(instance: Widget<WidgetState, WidgetProperties>): string {
	return `widget-${++widgetCount}`;
}

function isWNode(child: DNode): child is WNode {
	return Boolean(child && (<WNode> child).factory !== undefined);
}

function getFromRegistry(instance: Widget<WidgetState, WidgetProperties>, factoryLabel: string): FactoryRegistryItem | null {
	if (instance.registry.has(factoryLabel)) {
		return instance.registry.get(factoryLabel);
	}

	return registry.get(factoryLabel);
}

function dNodeToVNode(instance: Widget<WidgetState, WidgetProperties>, dNode: DNode): VNode | string | null {
	const internalState = widgetInternalStateMap.get(instance);

	if (typeof dNode === 'string' || dNode === null) {
		return dNode;
	}

	if (isWNode(dNode)) {
		const { children, options: { id, properties } } = dNode;

		let { factory } = dNode;
		let child: Widget<WidgetState, WidgetProperties>;

		if (typeof factory === 'string') {
			const item = getFromRegistry(instance, factory);

			if (isComposeFactory(item)) {
				factory = <WidgetFactory> item;
			}
			else {
				if (item && !internalState.initializedFactoryMap.has(factory)) {
					const promise = (<Promise<WidgetFactory>> item).then((factory) => {
						instance.invalidate();
						return factory;
					});
					internalState.initializedFactoryMap.set(factory, promise);
				}
				return null;
			}
		}

		const childrenMapKey = id || factory;
		const cachedChild = internalState.historicChildrenMap.get(childrenMapKey);

		if (cachedChild) {
			child = cachedChild;
			if (properties) {
				child.properties = properties;
			}
		}
		else {
			child = factory(dNode.options);
			child.own(child.on('invalidated', () => {
				instance.invalidate();
			}));
			internalState.historicChildrenMap.set(childrenMapKey, child);
			instance.own(child);
		}
		if (!id && internalState.currentChildrenMap.has(factory)) {
			const errorMsg = 'must provide unique keys when using the same widget factory multiple times';
			console.error(errorMsg);
			instance.emit({ type: 'error', target: instance, error: new Error(errorMsg) });
		}

		child.children = children;
		internalState.currentChildrenMap.set(childrenMapKey, child);

		return child.__render__();
	}

	dNode.children = dNode.children
		.filter((child) => child !== null)
		.map((child: DNode) => {
			return dNodeToVNode(instance, child);
		});

	return dNode.render({ bind: instance });
}

function manageDetachedChildren(instance: Widget<WidgetState, WidgetProperties>): void {
	const internalState = widgetInternalStateMap.get(instance);

	internalState.historicChildrenMap.forEach((child, key) => {
		if (!internalState.currentChildrenMap.has(key)) {
			internalState.historicChildrenMap.delete(key);
			child.destroy();
		}
	});
	internalState.currentChildrenMap.clear();
}

function formatTagNameAndClasses(tagName: string, classes: string[]) {
	if (classes.length) {
		return `${tagName}.${classes.join('.')}`;
	}
	return tagName;
}

function generateProperties(instance: Widget<WidgetState, WidgetProperties>, previousProperties: any): any {
	const changedPropertyKeys = instance.diffProperties(previousProperties);
	const changedProperties: { currentProperties: any, previousProperties: any } = {
		currentProperties: {},
		previousProperties: {}
	};

	changedPropertyKeys.forEach((key) => {
		changedProperties.currentProperties[key] = instance.properties[key];
		if (previousProperties[key]) {
			changedProperties.previousProperties[key] = previousProperties[key];
		}
	});

	return changedProperties;
}

const createWidget: WidgetFactory = createStateful
	.mixin(createVNodeEvented)
	.mixin<WidgetMixin<WidgetProperties>, WidgetOptions<WidgetState, WidgetProperties>>({
		mixin: {
			properties: {},

			classes: [],

			getNode(): DNode {
				const tag = formatTagNameAndClasses(this.tagName, this.classes);
				return v(tag, this.getNodeAttributes(), this.getChildrenNodes());
			},

			set children(this: Widget<WidgetState, WidgetProperties>, children: DNode[]) {
				const internalState = widgetInternalStateMap.get(this);
				internalState.children = children;
				this.emit({
					type: 'widget:children',
					target: this
				});
			},

			get children() {
				return widgetInternalStateMap.get(this).children;
			},

			getChildrenNodes(this: Widget<WidgetState, WidgetProperties>): DNode[] {
				return this.children;
			},

			getNodeAttributes(this: Widget<WidgetState, WidgetProperties>, overrides?: VNodeProperties): VNodeProperties {
				const props: VNodeProperties = {};

				this.nodeAttributes.forEach((fn) => {
					const newProps: VNodeProperties = fn.call(this);
					if (newProps) {
						assign(props, newProps);
					}
				});

				return props;
			},

			invalidate(this: Widget<WidgetState, WidgetProperties>): void {
				const internalState = widgetInternalStateMap.get(this);
				internalState.dirty = true;
				this.emit({
					type: 'invalidated',
					target: this
				});
			},

			get id(this: Widget<WidgetState, WidgetProperties>): string {
				const { id } = widgetInternalStateMap.get(this);

				return id;
			},

			diffProperties(this: Widget<WidgetState, WidgetProperties>, previousProperties: any): string[] {
				return Object.keys(this.properties);
			},

			copyProperties: function(this: Widget<WidgetState, WidgetProperties>, previousProperties: WidgetProperties, currentProperties: WidgetProperties): WidgetProperties {
				return assign({}, previousProperties, currentProperties);
			},

			applyChangedProperties: function(this: Widget<WidgetState, WidgetProperties>, previousProperties: WidgetProperties, currentProperties: WidgetProperties): void {
				if (Object.keys(currentProperties).length) {
					currentProperties['id'] = this.id;
					this.setState(currentProperties);
				}
			},

			nodeAttributes: [
				function (this: Widget<WidgetState, WidgetProperties>): VNodeProperties {
					const baseIdProp = this.state && this.state.id ? { 'data-widget-id': this.state.id } : {};
					const { styles = {} } = this.state || {};
					const classes: { [index: string]: boolean; } = {};

					const internalState = widgetInternalStateMap.get(this);

					internalState.widgetClasses.forEach((c) => classes[c] = false);

					if (this.state && this.state.classes) {
						this.state.classes.forEach((c) => classes[c] = true);
						internalState.widgetClasses =  this.state.classes;
					}

					return assign(baseIdProp, { key: this, classes, styles });
				}
			],

			__render__(this: Widget<WidgetState, WidgetProperties>): VNode | string | null {
				const internalState = widgetInternalStateMap.get(this);
				const updatedProperties = generateProperties(this, internalState.previousProperties);
				this.properties = this.copyProperties(updatedProperties.previousProperties, updatedProperties.currentProperties);
				this.applyChangedProperties(updatedProperties.previousProperties, updatedProperties.currentProperties);

				if (internalState.dirty || !internalState.cachedVNode) {
					const widget = dNodeToVNode(this, this.getNode());
					manageDetachedChildren(this);
					if (widget) {
						internalState.cachedVNode = widget;
					}
					internalState.dirty = false;
					internalState.previousProperties = this.properties;
					return widget;
				}
				return internalState.cachedVNode;
			},

			get registry(this: Widget<WidgetState, WidgetProperties>): FactoryRegistry {
				return widgetInternalStateMap.get(this).factoryRegistry;
			},

			tagName: 'div'
		},
		initialize(instance: Widget<WidgetState, WidgetProperties>, options: WidgetOptions<WidgetState, { id?: string }> = {}) {
			const { tagName, properties = {} } = options;
			const id = properties.id || options.id || generateID(instance);

			instance.properties = properties;
			instance.tagName = tagName || instance.tagName;

			widgetInternalStateMap.set(instance, {
				id,
				dirty: true,
				widgetClasses: [],
				previousProperties: properties,
				factoryRegistry: new FactoryRegistry(),
				initializedFactoryMap: new Map<string, Promise<WidgetFactory>>(),
				historicChildrenMap: new Map<string | Promise<WidgetFactory> | WidgetFactory, Widget<WidgetState, WidgetProperties>>(),
				currentChildrenMap: new Map<string | Promise<WidgetFactory> | WidgetFactory, Widget<WidgetState, WidgetProperties>>(),
				children: []
			});

			instance.applyChangedProperties({}, properties);
			instance.own(instance.on('state:changed', () => {
				instance.invalidate();
			}));
		}
	})
	.mixin(shallowPropertyComparisonMixin);

export default createWidget;
