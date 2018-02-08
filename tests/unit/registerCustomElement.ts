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
				if (this.children.length) {
					this.children[0].properties.world = 'i am not broken';
				}
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
				return v('div', [v('span', [`${world} Bar`]), v('div', { onclick: this._onClick }, this.children)]);
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
				const { b } = this.properties;
				return v('div', [v('div', { onclick: this._onClick }, [`baz ${b}`])]);
			}
		}
		registerCustomElement(Baz);

		@customElement<any>({
			tag: 'qux-element'
		})
		class Qux extends WidgetBase<{}> {
			render() {
				return v('div', ['qux']);
			}
		}
		registerCustomElement(Qux);

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
		foo.appendChild(bar);
		const qux = document.createElement('qux-element');
		document.body.appendChild(foo);
		foo.setAttribute('attribute', 'changed');
		setTimeout(() => {
			bar.appendChild(baz);
			foo.setAttribute('attribute', 'again');
			bar.setAttribute('world', 'yooo');
		}, 500);
		setTimeout(() => {
			bar.appendChild(qux);
		}, 1000);
		return new Promise(() => {});
	}
});
