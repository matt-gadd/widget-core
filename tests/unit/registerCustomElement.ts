import customElement from '../../src/decorators/customElement';
import WidgetBase from '../../src/WidgetBase';
import { v } from '../../src/d';
import register, { create } from '../../src/registerCustomElement';
import { createResolvers } from './../support/util';

const { describe, it, beforeEach, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

@customElement({
	tag: 'foo-element'
})
class Foo extends WidgetBase {
	render() {
		return v('div', ['hello world']);
	}
}

function createTestWidget(options: any) {
	const { properties, attributes, events } = options;
	@customElement<any>({
		tag: 'bar-element',
		properties,
		attributes,
		events
	})
	class Bar extends WidgetBase<any> {
		private _onClick() {
			const { onBar } = this.properties;
			onBar && onBar();
		}
		render() {
			const { myProp = '', myAttr = '' } = this.properties;
			return v('div', [
				v('button', { classes: ['event'], onclick: this._onClick }),
				v('div', { classes: ['prop'] }, [`${myProp}`]),
				v('div', { classes: ['attr'] }, [`${myAttr}`]),
				v('div', { classes: ['children'] }, this.children)
			]);
		}
	}
	return Bar;
}

describe('registerCustomElement', () => {
	let element: Element | undefined;
	const resolvers = createResolvers();

	beforeEach(() => {
		resolvers.stub();
	});
	afterEach(() => {
		resolvers.restore();
		if (element) {
			(element.parentNode as Element).removeChild(element);
		}
		element = undefined;
	});

	it('can create an element', () => {
		register(Foo);
		element = document.createElement('foo-element');
		document.body.appendChild(element);
		assert.equal(element.outerHTML, '<foo-element><div>hello world</div></foo-element>');
	});

	it('can create an element with property', () => {
		const Bar = createTestWidget({ properties: ['myProp'] });
		const CustomElement = create((Bar.prototype as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-1', CustomElement);
		element = document.createElement('bar-element-1');
		(element as any).myProp = 'hello';
		document.body.appendChild(element);
		const prop = element.querySelector('.prop') as HTMLElement;
		assert.equal(prop.innerHTML, 'hello');
	});

	it('can create an element with attribute', () => {
		const Bar = createTestWidget({ attributes: ['myAttr'] });
		const CustomElement = create((Bar.prototype as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-2', CustomElement);
		element = document.createElement('bar-element-2');
		element.setAttribute('myAttr', 'world');
		document.body.appendChild(element);
		const prop = element.querySelector('.attr') as HTMLElement;
		assert.equal(prop.innerHTML, 'world');
	});

	it('can create an element with event', () => {
		let called = false;
		const Bar = createTestWidget({ events: ['onBar'] });
		const CustomElement = create((Bar.prototype as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-3', CustomElement);
		element = document.createElement('bar-element-3');
		element.addEventListener('bar', () => {
			called = true;
		});
		document.body.appendChild(element);
		const event = element.querySelector('.event') as HTMLElement;
		event.click();
		assert.isTrue(called);
	});

	it('can create an element with child', () => {
		const BarA = createTestWidget({});
		const CustomElementA = create((BarA.prototype as any).__customElementDescriptor, BarA);
		customElements.define('bar-a', CustomElementA);
		const BarB = createTestWidget({});
		const CustomElementB = create((BarB.prototype as any).__customElementDescriptor, BarB);
		customElements.define('bar-b', CustomElementB);
		element = document.createElement('bar-a');
		const barB = document.createElement('bar-b');
		document.body.appendChild(element);
		element.appendChild(barB);
		resolvers.resolve();
		const container = element.querySelector('.children');
		const children = (container as any).children;
		assert.equal(children[0].tagName, 'BAR-B');
	});
});
