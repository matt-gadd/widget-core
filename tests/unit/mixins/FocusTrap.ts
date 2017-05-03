import * as registerSuite from 'intern!object';
import { v, w } from '../../../src/d';
import FocusTrap from '../../../src/mixins/FocusTrap';
import { ProjectorMixin } from '../../../src/mixins/Projector';
import { WidgetBase } from '../../../src/WidgetBase';
import { WidgetProperties } from '../../../src/interfaces';

export interface MenuProperties extends WidgetProperties {
	onToggle: any;
	trap: boolean;
}

class Menu extends WidgetBase<MenuProperties> {
	private _toggle() {
		const { onToggle } = this.properties;
		onToggle && onToggle();
		this.invalidate();
	}
	render() {
		const { trap } = this.properties;
		const trappedText = trap ? 'on' : 'off';
		return w(FocusTrap, { trap, focusOnTrap: true }, [
			v('div', [
				v('div', { classes: { underlay: trap } }),
				v('div', { classes: { content: trap } }, [
					v('button', [ 'a' ]),
					v('button', [ 'b' ]),
					v('button', [ 'c' ]),
					v('button', { bind: this, onclick: this._toggle }, [ `trap is: ${trappedText}` ])
				])
			])
		]);
	}
}

class Foo extends WidgetBase<WidgetProperties> {

	private _trapA = false;
	private _trapB = false;
	private _trapC = false;

	onToggleA() {
		this._trapA = !this._trapA;
		this.invalidate();
	}
	onToggleB() {
		this._trapB = !this._trapB;
		this.invalidate();
	}
	onToggleC() {
		this._trapC = !this._trapC;
		this.invalidate();
	}
	render() {
		return v('div', [
			w(Menu, { key: 'a', trap: this._trapA, onToggle: this.onToggleA }),
			w(Menu, { key: 'b', trap: this._trapB, onToggle: this.onToggleB }),
			w(Menu, { key: 'c', trap: this._trapC, onToggle: this.onToggleC })
		]);
	}
}

registerSuite({
	name: 'mixins/FocusTrapMixin',
	integration: {
		beforeEach() {
			const elHead = document.getElementsByTagName('head')[0];
			const elStyle = document.createElement('style');
			elStyle.type = 'text/css';
			elHead.appendChild(elStyle);
			elStyle.innerHTML = `
			.underlay {
				background: rgba(0, 0, 0, 0.54);
				height: 100%;
				left: 0;
				position: absolute;
				top: 0;
				width: 100%;
				z-index: 0;
			}
			.content {
				position: relative;
				'z-index': 1;
			}
			`;
		},
		'works with widget base'() {
			const Projector = ProjectorMixin(Foo);
			const projector = new Projector();
			projector.append();
			return new Promise((resolve) => {
			});
		}
	}
});
