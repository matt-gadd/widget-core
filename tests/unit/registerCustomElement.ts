const { registerSuite } = intern.getInterface('object');
import registerCustomElement from '../../src/registerCustomElement';
import customElement from '../../src/decorators/customElement';
import WidgetBase from '../../src/WidgetBase';
import { v } from '../../src/d';

const { assert } = intern.getPlugin('chai');

registerSuite('registerCustomElement', {
	foo() {
		@customElement<any>({
			tag: 'foo-element',
			properties: ['property'],
			attributes: ['attribute'],
			events: ['onFoo']
		})
		class Foo extends WidgetBase<{
			property: string;
			attribute: string;
			onFoo: () => void;
		}> {
			_onClick() {
				const { onFoo } = this.properties;
				onFoo();
			}
			render() {
				const { property, attribute } = this.properties;
				return v('div', [v('button', { onclick: this._onClick }, [attribute]), ...this.children]);
			}
		}
		registerCustomElement(Foo);

		@customElement<any>({
			tag: 'bar-element',
			properties: ['hello'],
			attributes: ['world'],
			events: ['onBar']
		})
		class Bar extends WidgetBase<{
			hello: string;
			world: string;
			onBar: () => void;
		}> {
			_onClick() {
				const { onBar } = this.properties;
				onBar();
			}
			render() {
				const { world } = this.properties;
				return v('div', [v('span', ['Bar']), v('div', { onclick: this._onClick }, this.children)]);
			}
		}
		registerCustomElement(Bar);

		@customElement<any>({
			tag: 'baz-element',
			properties: ['a'],
			attributes: ['b'],
			events: ['onBaz']
		})
		class Baz extends WidgetBase<{
			a: string;
			b: string;
			onBaz: () => void;
		}> {
			_onClick() {
				const { onBaz } = this.properties;
				onBaz();
			}
			render() {
				return v('div', [v('div', { onclick: this._onClick }, ['i am a child'])]);
			}
		}
		registerCustomElement(Baz);

		const foo = document.createElement('foo-element') as any;
		foo.property = 'blah';
		foo.setAttribute('attribute', 'lol');
		foo.addEventListener('foo', () => {
			console.log('event foo');
		});
		const bar = document.createElement('bar-element');
		bar.hello = 'cool';
		bar.setAttribute('world', 'story');
		const baz = document.createElement('baz-element');
		baz.setAttribute('b', 'is this the real life');
		bar.appendChild(baz);
		foo.appendChild(bar);
		document.body.appendChild(foo);
		foo.setAttribute('attribute', 'changed');
		setTimeout(() => {
			foo.setAttribute('attribute', 'again');
		}, 500);
		setTimeout(() => {
			bar.setAttribute('world', 'yup');
		}, 1000);
		return new Promise(() => {});
	}
});
