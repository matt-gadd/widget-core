import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Symbol from '@dojo/shim/Symbol';
import { WidgetConstructor } from './interfaces';

export type WidgetConstructorFunction = () => Promise<WidgetConstructor>;

export type WidgetRegistryItem = WidgetConstructor | Promise<WidgetConstructor> | WidgetConstructorFunction;

interface InternalRegistryItem {
	item?: WidgetRegistryItem;
	resolver?: Function;
	promise?: Promise<any>;
	pending: boolean;
}

/**
 * Widget base symbol type
 */
export const WIDGET_BASE_TYPE = Symbol('Widget Base');

/**
 * Widget Registry Interface
 */
export interface WidgetRegistry {

	/**
	 * define a WidgetRegistryItem for a specified label
	 *
	 * @param widgetLabel The label of the widget to register
	 * @param registryItem The registry item to define
	 */
	define(widgetLabel: string, registryItem: WidgetRegistryItem): void;

	/**
	 * Return a WidgetRegistryItem for the given label, null if an entry doesn't exist
	 *
	 * @param widgetLabel The label of the widget to return
	 * @returns The WidgetRegistryItem for the widgetLabel, `null` if no entry exists
	 */
	get(widgetLabel: string): WidgetConstructor | Promise<WidgetConstructor>;

	/**
	 * Returns a boolean if an entry for the label exists
	 *
	 * @param widgetLabel The label to search for
	 * @returns boolean indicating if a widget registry item exists
	 */
	has(widgetLabel: string): boolean;
}

/**
 * Checks is the item is a subclass of WidgetBase (or a WidgetBase)
 *
 * @param item the item to check
 * @returns true/false indicating if the item is a WidgetConstructor
 */
export function isWidgetBaseConstructor(item: any): item is WidgetConstructor {
	return Boolean(item && item._type === WIDGET_BASE_TYPE);
}

/**
 * The WidgetRegistry implementation
 */
export class WidgetRegistry implements WidgetRegistry {

	private registry: Map<string, InternalRegistryItem>;

	constructor() {
		this.registry = new Map<string, InternalRegistryItem>();
	}

	private resolve(widgetLabel: string, ctor: WidgetConstructor) {
		const internalItem = this.registry.get(widgetLabel) || { pending: false };
		const { resolver, promise } = internalItem;
		this.registry.set(widgetLabel, { item: ctor, resolver, promise, pending: false });
		resolver && resolver(ctor);
	}

	has(widgetLabel: string): boolean {
		const registryItem = this.registry.get(widgetLabel);
		return !!(registryItem && registryItem.item);
	}

	define(widgetLabel: string, registryItem: WidgetRegistryItem): void {
		const internalItem = this.registry.get(widgetLabel) || { pending: true };
		const { item, resolver, promise, pending } = internalItem;

		if (item) {
			throw new Error(`widget has already been registered for '${widgetLabel}'`);
		}
		else if (isWidgetBaseConstructor(registryItem)) {
			this.resolve(widgetLabel, registryItem);
		}
		else if (registryItem instanceof Promise) {
			registryItem.then((widgetCtor) => {
				this.resolve(widgetLabel, widgetCtor);
			});
		}
		this.registry.set(widgetLabel, { item: registryItem, resolver, promise, pending });
	}

	get(widgetLabel: string): WidgetConstructor | Promise<WidgetConstructor> {
		const internalItem = this.registry.get(widgetLabel) || { pending: true };
		let { item, promise, resolver, pending } = internalItem;

		if (item && isWidgetBaseConstructor(item)) {
			return item;
		}
		else if (typeof item === 'function') {
			item = item();
			item.then((widgetCtor) => {
				this.resolve(widgetLabel, widgetCtor);
			});
		}

		if (!promise) {
			promise = new Promise((resolve) => {
				resolver = resolve;
			});
		}
		this.registry.set(widgetLabel, { item, promise, resolver, pending });
		return promise;
	}
}

export default WidgetRegistry;
