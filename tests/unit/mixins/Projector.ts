import global from '@dojo/core/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { spy } from 'sinon';
import { ProjectorMixin, ProjectorState, ProjectorProperties } from '../../../src/mixins/Projector';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';

class TestWidget extends ProjectorMixin(WidgetBase)<ProjectorProperties> {}

registerSuite({
	name: 'mixins/projectorMixin',

	'construct projector with css transitions'() {
		global.cssTransitions = {};
		try {
			new TestWidget({ cssTransitions: true });
		}
		catch (err) {
			assert.fail(null, null, 'Projector should be created without throwing an error');
		}

	},
	'constructing projector configured for css transitions throws when css-transitions script is not loaded.'() {
		global.cssTransitions = undefined;
		try {
			new TestWidget({ cssTransitions: true });
			assert.fail();
		}
		catch (err) {
			assert.isTrue(err instanceof Error);
			assert.equal(err.message, 'Unable to create projector with css transitions enabled. Is the \'css-transition.js\' script loaded in the page?');
		}
	},
	'render throws an error for null result'() {
		const projector = new class extends TestWidget {
			render() {
				return null;
			}
		}({});

		try {
			projector.__render__();
			assert.fail();
		}
		catch (error) {
			assert.isTrue(error instanceof Error);
			assert.equal(error.message, 'Must provide a VNode at the root of a projector');
		}
	},
	'render throws an error for string result'() {
		const projector = new class extends TestWidget {
			render() {
				return '';
			}
		}({});

		try {
			projector.__render__();
			assert.fail();
		}
		catch (error) {
			assert.isTrue(error instanceof Error);
			assert.equal(error.message, 'Must provide a VNode at the root of a projector');
		}
	},
	'render does not attach after create when there are no properties'() {
		const projector = new class extends TestWidget {
			render() {
				return v('div', {});
			}

			__render__() {
				const results: any = super.__render__();
				results.properties = undefined;
				return results;
			}
		}({});

		const vnode  = <any> projector.__render__();
		assert.isUndefined(vnode.properties);
	},
	'attach to projector': {
		'append'() {
			const childNodeLength = document.body.childNodes.length;
			const projector = new TestWidget({});

			projector.setChildren([ v('h2', [ 'foo' ] ) ]);

			return projector.append().then((attachHandle) => {
				assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
				const child = <HTMLElement> document.body.lastChild;
				assert.strictEqual(child.innerHTML, '<h2>foo</h2>');
				assert.strictEqual(child.tagName.toLowerCase(), 'div');
				assert.strictEqual(( <HTMLElement> child.firstChild).tagName.toLowerCase(), 'h2');
			});
		},
		'merge'() {
			const childNodeLength = document.body.childNodes.length;
			const projector = new TestWidget({});

			projector.setChildren([ v('h2', [ 'foo' ] ) ]);

			return projector.merge().then((attachHandle) => {
				assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
				const child = <HTMLElement> document.body.lastChild;
				assert.strictEqual(child.innerHTML, 'foo');
				assert.strictEqual(child.tagName.toLowerCase(), 'h2');
			});
		}
	},
	'attach event'() {
		const root = document.createElement('div');
		document.body.appendChild(root);
		const projector = new TestWidget({ root });

		projector.setChildren([ v('h2', [ 'foo' ] ) ]);

		assert.strictEqual(root.childNodes.length, 0, 'there should be no children');
		let eventFired = false;
		projector.on('projector:attached', () => {
			eventFired = true;
			assert.strictEqual(root.childNodes.length, 1, 'a child should be added');
			assert.strictEqual((<HTMLElement> root.firstChild).tagName.toLowerCase(), 'div');
			assert.strictEqual((<HTMLElement> root.firstChild).innerHTML, '<h2>foo</h2>');
		});
		return projector.append().then(() => {
			assert.isTrue(eventFired);
		});
	},
	'get root'() {
		const projector = new TestWidget({});
		const root = document.createElement('div');
		assert.equal(projector.root, document.body);
		projector.root = root;
		assert.equal(projector.root, root);
	},
	'get projector state'() {
		const projector = new TestWidget({});

		assert.equal(projector.projectorState, ProjectorState.Detached);
		return projector.append().then(() => {
			assert.equal(projector.projectorState, ProjectorState.Attached);
			projector.destroy();
			assert.equal(projector.projectorState, ProjectorState.Detached);
		});

	},
	'destroy'() {
		const projector: any = new TestWidget({});
		const maquetteProjectorStopSpy = spy(projector, 'pause');
		const maquetteProjectorDetachSpy = spy(projector, 'detach');

		return projector.append().then(() => {
			projector.destroy();

			assert.isTrue(maquetteProjectorStopSpy.calledOnce);
			assert.isTrue(maquetteProjectorDetachSpy.calledOnce);

			projector.destroy();

			assert.isTrue(maquetteProjectorStopSpy.calledOnce);
			assert.isTrue(maquetteProjectorDetachSpy.calledOnce);
		});

	},
	'invalidate on setting children'() {
		const projector = new TestWidget({});
		let called = false;

		projector.on('invalidated', () => {
			called = true;
		});

		projector.setChildren([ v('div') ]);

		assert.isTrue(called);
	},
	'invalidate before attached'() {
		const projector: any = new TestWidget({});
		let called = false;

		projector.on('render:scheduled', () => {
			called = true;
		});

		projector.invalidate();
		assert.isFalse(called);
	},
	'invalidate after attached'() {
		const projector: any = new TestWidget({});
		let called = false;

		projector.on('render:scheduled', () => {
			called = true;
		});

		return projector.append().then(() => {
			projector.invalidate();
			assert.isTrue(called);
		});
	},
	'reattach'() {
		const root = document.createElement('div');
		const projector = new TestWidget({ root });
		const promise = projector.append();
		assert.strictEqual(promise, projector.append(), 'same promise should be returned');
	},
	'setRoot throws when already attached'() {
		const projector = new TestWidget({});
		const div = document.createElement('div');
		projector.root = div;
		return projector.append().then((handle) => {
			assert.throws(() => {
				projector.root = document.body;
			}, Error, 'already attached');
		});
	},
	foo: {
		beforeEach() {
			return new Promise((resolve) => {
				const w: any = window;
				const def = w.define;
				w.define = undefined;
				const d = document;
				const script = d.createElement('script');
				script.type = 'text/javascript';
				script.async = true;
				script.onload = function(){
					resolve();
					w.define = def;
				};
				script.src = 'https://code.jquery.com/pep/0.4.1/pep.js';
				d.getElementsByTagName('head')[0].appendChild(script);
			});
		},
		'boo'() {
			const projector = new class extends TestWidget {
				onRoot() {
					console.log('event fired for root');
				}
				onNested() {
					console.log('event fired for nested');
				}
				onNestedReturn() {
					console.log('event fired nested return false');
					return false;
				}
				onNestedStopPropagation(e: any) {
					console.log('event fired nested prevent propagation');
					e.stopPropagation();
				}
				onMouseOver() {
					console.log('on mouse over');
					return false;
				}
				render() {
					const children = [
						v('div', {
							onclick: this.onNested,
							onmouseover: this.onMouseOver,
							style: 'width: 100px; height: 100px; background: red;',
							innerHTML: 'child'
						}),
						v('div', {
							onclick: this.onNestedReturn,
							style: 'width: 100px; height: 100px; background: green;',
							innerHTML: 'child: return false'
						}),
						v('div', {
							onclick: this.onNestedStopPropagation,
							style: 'width: 100px; height: 100px; background: orange;',
							innerHTML: 'child: stop propagation'
						})
					];
					return v('div', {
						onclick: this.onRoot,
						style: 'width: 300px; height: 300px; background: yellow;'
					}, children);
				}
			}({});
			return projector.append().then(() => {
				return new Promise((resolve) => {
				});
			});
		}
	}
});
