const { registerSuite } = intern.getInterface('object');

import { v, w } from '../../src/d';
import { ProjectorMixin } from '../../src/mixins/Projector';
import { WidgetBase } from '../../src/WidgetBase';
import Registry from '../../src/Registry';
import Container from '../../src/Container';

class Bar extends WidgetBase<{ value: number; increment: any }> {
	render() {
		const { value, increment } = this.properties;
		return v('div', { onclick: () => increment() }, [`Bar ${value}`]);
	}
}

class Baz extends WidgetBase<{ value: number; increment: any }> {
	render() {
		const { value, increment } = this.properties;
		return v('div', { onclick: () => increment() }, [`Baz ${value}`]);
	}
}

const BarContainer = Container(Bar, 'my-injector', { getProperties: (payload) => payload });
const BazContainer = Container(Baz, 'my-injector', { getProperties: (payload) => payload });

class Foo extends WidgetBase {
	render() {
		return v('div', [w(BarContainer, {}), w(BazContainer, {})]);
	}
}

function createStateful(invalidate: any) {
	let value = 0;
	function increment() {
		value++;
		invalidate();
	}
	return {
		get() {
			return { value, increment };
		}
	};
}

registerSuite('Foo', {
	foo() {
		const registry = new Registry();
		registry.defineInjector('my-injector', (invalidate: any) => {
			const stateful = createStateful(invalidate);
			return () => stateful.get();
		});
		const Projector = ProjectorMixin(Foo);
		const projector = new Projector();
		projector.setProperties({ registry });
		projector.append();
		return new Promise((resolve) => {});
	}
});
