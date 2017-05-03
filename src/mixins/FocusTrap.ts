import { WidgetBase, afterRenderVNode, diffProperty } from './../WidgetBase';
import { VNode } from '@dojo/interfaces/vdom';
import {
	Constructor,
	WidgetProperties
} from '../interfaces';

let stack: any[] = [];
let timer: any = null;

if (document && document.activeElement) {
	stack.push(document.activeElement);
}

export interface FocusTrapMixinProperties extends WidgetProperties {
	trap: boolean;
}

export function FocusTrapMixin<T extends Constructor<WidgetBase<FocusTrapMixinProperties>>>(base: T): T {
	class FocusTrap extends base {
		private _boundOnBlur: any;
		private _root: any;

		constructor(...args: any[]) {
			super(...args);
			this._boundOnBlur = this._onBlur.bind(this);
			this.own({ destroy: this._remove.bind(this) });
		}

		contains(element: any): boolean {
			return this._root.contains(element);
		}

		focus() {
			if (this.contains(document.activeElement) === false) {
				this._root.focus();
			}
		}

		@diffProperty('trap')
		public diffPropertyTrap(previousValue: boolean, value: boolean): any {
			const changed = previousValue === value;
			if (previousValue !== value) {
				if (value === true) {
					this._add();
				}
				else {
					this._remove();
				}
			}
			return {
				changed,
				value: value
			};
		}

		private _add() {
			stack.push(this);
			document && document.addEventListener('focus', this._boundOnBlur, true);
		}

		private _remove() {
			stack = stack.filter(i => i !== this);
			document && document.removeEventListener('focus', this._boundOnBlur, true);
			clearTimeout(timer);
		}

		private _setRoot(element: any) {
			this._root = element;
		}

		private _onBlur(event: any) {
			const current = stack[stack.length - 1];
			if (current === this && current && current.contains(event.target) === false) {
				event.preventDefault();
				this._trap();
			}
		}

		private _trap() {
			clearTimeout(timer);
			stack[ stack.length - 1 ].focus();
			timer = setTimeout(() => {
				stack[stack.length - 1].focus();
			}, 10);
		}

		@afterRenderVNode()
		private _setRootAndTabIndex(result: VNode): VNode {
			const { trap } = this.properties;
			if (result && result.properties) {
				result.properties.afterCreate = this._setRoot;
				if (trap) {
					(<any> result.properties).tabIndex = 0;
				}
				else {
					(<any> result.properties).tabIndex = -1;
				}
			}
			return result;
		}

	}
	return FocusTrap;
}

export default FocusTrapMixin;
