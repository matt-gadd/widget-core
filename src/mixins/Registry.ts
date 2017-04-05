import WidgetRegistry from '../WidgetRegistry';
import { WidgetBase, diffProperty } from './../WidgetBase';
import {
	PropertyChangeRecord,
	Constructor,
	WidgetProperties
} from '../interfaces';

export interface RegistryMixinProperties extends WidgetProperties {
	registry: WidgetRegistry;
}

export function RegistryMixin<T extends Constructor<WidgetBase<RegistryMixinProperties>>>(base: T): T {
	class Registry extends base {

		private _previousRegistrySize: number;

		@diffProperty('registry')
		public diffPropertyRegistry(previousValue: WidgetRegistry, value: WidgetRegistry): PropertyChangeRecord {
			let changed = false;
			if (!previousValue) {
				this.registries.add(value);
				changed = true;
			} else if (previousValue !== value) {
				this.registries.replace(previousValue, value);
				changed = true;
			} else if (this._previousRegistrySize !== value.size) {
				changed = true;
			}
			this._previousRegistrySize = value.size;
			return {
				changed,
				value: value
			};
		}
	};
	return Registry;
}

export default RegistryMixin;
