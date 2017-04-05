import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { RegistryMixin, RegistryMixinProperties } from '../../../src/mixins/Registry';
import WidgetRegistry from '../../../src/WidgetRegistry';
import { WidgetBase } from '../../../src/WidgetBase';
import { w, v } from '../../../src/d';
import { VNode } from '@dojo/interfaces/vdom';
import { spy } from 'sinon';

class TestWithRegistry extends RegistryMixin(WidgetBase)<RegistryMixinProperties> {
	private _changedKeys: string[];
	constructor() {
		super();
		this.on('properties:changed', (evt) => {
			this._changedKeys = evt.changedPropertyKeys;
		});
	}
	setProperties(properties: any) {
		this._changedKeys = [];
		super.setProperties(properties);
	}
	getChangedKeys() {
		return this._changedKeys;
	}
	getRegistries() {
		return this.registries;
	}
}

registerSuite({
	name: 'mixins/RegistryMixin',
	property: {
		'adds registry and marks as changed when no previous registry'() {
			const widget = new TestWithRegistry();
			const registry = new WidgetRegistry();
			const add = spy(widget.getRegistries(), 'add');
			widget.setProperties({ registry });
			assert.isTrue(add.calledWith(registry));
			assert.deepEqual(widget.getChangedKeys(), [ 'registry' ]);
		},
		'replaces registry and marks as changed when different to previous registry'() {
			const widget = new TestWithRegistry();
			const registry = new WidgetRegistry();

			widget.setProperties({ registry });

			const replace = spy(widget.getRegistries(), 'replace');
			const newRegistry = new WidgetRegistry();

			widget.setProperties({ registry: newRegistry });
			assert.isTrue(replace.calledWith(registry, newRegistry));
			assert.deepEqual(widget.getChangedKeys(), [ 'registry' ]);
		},
		'marks as changed when registry size changes'() {
			const widget = new TestWithRegistry();
			const registry = new WidgetRegistry();

			widget.setProperties({ registry });

			const add = spy(widget.getRegistries(), 'add');
			const replace = spy(widget.getRegistries(), 'replace');

			registry.define('foo', WidgetBase);

			widget.setProperties({ registry });
			assert.isFalse(add.called);
			assert.isFalse(replace.called);
			assert.deepEqual(widget.getChangedKeys(), [ 'registry' ]);
		}
	},
	integration: {
		'works with widget base'() {
			class IntegrationTest extends TestWithRegistry {
				render() {
					return v('div', [
						w('test', { id: `${Math.random()}` })
					]);
				}
			}
			class Header extends WidgetBase<any> {
				render() {
					return v('header');
				}
			}
			class Span extends WidgetBase<any> {
				render() {
					return v('span');
				}
			}

			const registry = new WidgetRegistry();
			registry.define('test', Header);

			const instance: any = new IntegrationTest();
			instance.setProperties({ registry });

			let result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');

			const newRegistry = new WidgetRegistry();
			newRegistry.define('test', Span);

			instance.setProperties({ registry: newRegistry });

			result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'span');
		}
	}
});
