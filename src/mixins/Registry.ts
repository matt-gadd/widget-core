import { includes } from '@dojo/shim/array';
import FactoryRegistry from '../FactoryRegistry';
import { WidgetBase, onPropertiesChanged, diffProperty } from './../WidgetBase';
import {
	PropertyChangeRecord,
	PropertiesChangeEvent,
	Constructor,
	WidgetProperties
} from '../interfaces';

export interface RegistryMixinProperties extends WidgetProperties {
	registry: FactoryRegistry;
}

export function RegistryMixin<T extends Constructor<WidgetBase<RegistryMixinProperties>>>(base: T): T {
	class Registry extends base {

		@diffProperty('registry')
		public diffPropertyRegistry(previousValue: FactoryRegistry, value: FactoryRegistry): PropertyChangeRecord {
			const changed = previousValue !== value;
			if (changed) {
				const position = this._registries.indexOf(previousValue);
				if (position > -1) {
					this._registries.splice(position, 1);
				}
			}
			return {
				changed,
				value
			};
		}

		@onPropertiesChanged
		protected onPropertiesChanged(evt: PropertiesChangeEvent<this, RegistryMixinProperties>) {
			if (includes(evt.changedPropertyKeys, 'registry')) {
				this._registries.push(evt.properties.registry);
			}
		}
	};
	return Registry;
}

export default RegistryMixin;
