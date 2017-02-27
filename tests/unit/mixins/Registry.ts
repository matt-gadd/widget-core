import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { RegistryMixin, RegistryMixinProperties } from '../../../src/mixins/Registry';
import FactoryRegistry from '../../../src/FactoryRegistry';
import { WidgetBase } from '../../../src/WidgetBase';
import { w, v } from '../../../src/d';
import { VNode } from '@dojo/interfaces/vdom';
import { spy } from 'sinon';

class TestWithRegistry extends RegistryMixin(WidgetBase)<RegistryMixinProperties> {}

registerSuite({
	name: 'mixins/RegistryMixin',
	property: {
		'passed registry is available via getter'() {
			const registry = new FactoryRegistry();
			const instance: any = new TestWithRegistry();
			instance.setProperties({ registry });
			assert.equal(instance._registries[0], registry);
		},
		'no passed registry, nothing available via getter'() {
			const instance: any = new TestWithRegistry();
			instance.setProperties(<any> {});
			assert.equal(instance._registries.length, 1);
		},
		'passed registry updated on property change'() {
			const registry = new FactoryRegistry();
			const newRegistry = new FactoryRegistry();
			const instance: any = new TestWithRegistry();
			instance.setProperties({ registry });
			assert.equal(instance._registries[0], registry);
			instance.setProperties({ registry: newRegistry });
			assert.equal(instance._registries[0], newRegistry);
		},
		'different property passed on property change should not affect registry'() {
			const registry = new FactoryRegistry();
			const instance: any = new TestWithRegistry();
			instance.setProperties({ registry, foo: false });
			assert.equal(instance._registries[0], registry);
			instance.setProperties({ registry, foo: true });
			assert.equal(instance._registries[0], registry);
		},
		'is excluded from the catch all diffProperties function'() {
			const registry = new FactoryRegistry();
			const instance: any = new TestWithRegistry();
			const diffProps = spy(instance, 'diffProperties');
			instance.setProperties({ registry });
			const [ , props ] = diffProps.firstCall.args;
			assert.deepEqual(props, {});
		},
		'compares size of registry when diffing'() {
			const registry = new FactoryRegistry();
			registry.define('foo', TestWithRegistry);
			const instance: any = new TestWithRegistry();
			instance.setProperties({ registry });
			instance.dirty = false;
			registry.define('bar', TestWithRegistry);
			instance.setProperties({ registry });
			assert.isTrue(instance.dirty);
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

			const registry = new FactoryRegistry();
			registry.define('test', Header);

			const instance: any = new IntegrationTest();
			instance.setProperties({ registry });

			let result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');

			const newRegistry = new FactoryRegistry();
			newRegistry.define('test', Span);

			instance.setProperties({ registry: newRegistry });

			result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'span');
		}
	}
});
