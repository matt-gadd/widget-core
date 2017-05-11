import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { w, v } from '../../../src/d';
import { RegistryMixin, RegistryMixinProperties } from '../../../src/mixins/Registry';
import { WidgetBase, DimensionsMeta, AnimationsMeta } from '../../../src/WidgetBase';
import WidgetRegistry from '../../../src/WidgetRegistry';
import { ProjectorMixin } from '../../../src/mixins/Projector';
import { spy } from 'sinon';

class TestWithRegistry extends RegistryMixin(WidgetBase)<RegistryMixinProperties> {
	private _changedKeys: string[];
	constructor() {
		super();
		this.on('properties:changed', (evt) => {
			this._changedKeys = evt.changedPropertyKeys;
		});
	}
	__setProperties__(properties: any) {
		this._changedKeys = [];
		super.__setProperties__(properties);
	}
	getChangedKeys() {
		return this._changedKeys;
	}
	getRegistries() {
		return this.registries;
	}
	render() {
		const dimensions = this.meta(DimensionsMeta);
		const animations = this.meta(AnimationsMeta);
		return v('div', { key: 'foo', dimensions: true }, [
			JSON.stringify(dimensions.get('foo')),
			JSON.stringify(animations.get('animationId'))
		]);
	}
}

registerSuite({
	name: 'mixins/RegistryMixin',
	property: {
		'adds registry and marks as changed when no previous registry'() {
			const Widget = ProjectorMixin(TestWithRegistry);
			const widget = new Widget();
			const registry = new WidgetRegistry();
			widget.setProperties({ registry });
			widget.append();
			return new Promise((resolve) => {
			});
		},
		'replaces registry and marks as changed when different to previous registry'() {
			const widget = new TestWithRegistry();
			const registry = new WidgetRegistry();

			widget.__setProperties__({ registry });

			const replace = spy(widget.getRegistries(), 'replace');
			const newRegistry = new WidgetRegistry();

			widget.__setProperties__({ registry: newRegistry });
			assert.isTrue(replace.calledWith(registry, newRegistry));
			assert.deepEqual(widget.getChangedKeys(), [ 'registry' ]);
		}
	},
	integration: {
		'works with widget base'() {
			class IntegrationTest extends TestWithRegistry {
				render() {
					return v('div', [
						w<any>('test', { id: `${Math.random()}` })
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
			instance.__setProperties__({ registry });

			let result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');

			const newRegistry = new WidgetRegistry();
			newRegistry.define('test', Span);

			instance.__setProperties__({ registry: newRegistry });

			result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'span');
		}
	}
});
