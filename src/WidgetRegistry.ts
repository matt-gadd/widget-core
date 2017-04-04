import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Symbol from '@dojo/shim/Symbol';
import { WidgetConstructor } from './interfaces';

export type WidgetConstructorFunction = () => Promise<WidgetConstructor>;

export type WidgetRegistryItem = WidgetConstructor | Promise<WidgetConstructor> | WidgetConstructorFunction;

type InternalWidgetRegistryItem = {
	invalidators?: Function[];
	item?: WidgetRegistryItem;
	pending: boolean;
};

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
	get(widgetLabel: string, invalidator?: Function): WidgetConstructor | Promise<WidgetConstructor> | null;

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

	/**
	 * internal map of labels and WidgetRegistryItem
	 */
	private registry: Map<string, InternalWidgetRegistryItem>;

	constructor() {
		this.registry = new Map<string, InternalWidgetRegistryItem>();
	}

	private invalidate(widgetLabel: string) {
		const internalRegistryItem = this.registry.get(widgetLabel) || { pending: true };
		const { invalidators = [], item } = internalRegistryItem;
		invalidators.forEach((invalidator) => invalidator());
		this.registry.set(widgetLabel, { item, invalidators: [], pending: false });
	}

	has(widgetLabel: string): boolean {
		const internalRegistryItem = this.registry.get(widgetLabel);
		return !!(internalRegistryItem && internalRegistryItem.item);
	}

	define(widgetLabel: string, registryItem: WidgetRegistryItem): void {
		let internalRegistryItem = this.registry.get(widgetLabel) || { pending: true };
		if (internalRegistryItem.item) {
			throw new Error(`widget has already been registered for '${widgetLabel}'`);
		}
		internalRegistryItem.item = registryItem;
		this.registry.set(widgetLabel, internalRegistryItem);
	}

	get(widgetLabel: string, invalidator?: Function): WidgetConstructor | Promise<WidgetConstructor> | null {
		const internalRegistryItem = this.registry.get(widgetLabel) || { pending: true };
		const { invalidators = [], item, pending } = internalRegistryItem;

		// first of all, if we have an invalidator, add it to the invalidator list if it doesn't exist
		if (pending && invalidator && invalidators.indexOf(invalidator) < 0) {
			invalidators.push(invalidator);
		}

		// if we have no item, set an item in the registry with invalidators
		if (!item) {
			this.registry.set(widgetLabel, { invalidators, pending: true });
			return null;
		}

		// if we are a widget base constructor, return the item, and we are no longer pending
		if (isWidgetBaseConstructor(item)) {
			if (pending) {
				this.invalidate(widgetLabel);
			}
			return item;
		}

		if (item instanceof Promise) {
			this.registry.set(widgetLabel, { invalidators, pending: true });
			item.then((widgetCtor) => {
				const result = this.registry.get(widgetLabel);
				result.item = widgetCtor;
				this.registry.set(widgetLabel, result.item);
				this.invalidate(widgetLabel);
			});
			return item;
		}
		else {
			const promise = (<WidgetConstructorFunction> item)();
			this.registry.set(widgetLabel, { item: promise, invalidators, pending: true });
			promise.then((widgetCtor) => {
				const result = this.registry.get(widgetLabel);
				result.item = widgetCtor;
				this.registry.set(widgetLabel, result.item);
				this.invalidate(widgetLabel);
			});
			return promise;
		}
	}
}

export default WidgetRegistry;
