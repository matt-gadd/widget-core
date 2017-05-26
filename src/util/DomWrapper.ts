import { WidgetBase } from './../WidgetBase';
import { WidgetProperties, VirtualDomProperties, Constructor } from './../interfaces';
import { v } from './../d';
import { VNode } from '@dojo/interfaces/vdom';

export interface DomWrapperOptions {
	onAttached?(): void;
}

export type DomWrapperProperties = VirtualDomProperties & WidgetProperties;

export type DomWrapper = Constructor<WidgetBase<DomWrapperProperties>>;

export function DomWrapper(domNode: Element, options: DomWrapperOptions = {}): DomWrapper {
	return class extends WidgetBase<DomWrapperProperties> {
		private _vNode: VNode;
		private _firstRender = true;

		protected onElementCreated(element: Element, key: string) {
			element.parentNode && element.parentNode.replaceChild(domNode, element);
			this._vNode.domNode = domNode;
			this._firstRender = false;
			options.onAttached && options.onAttached();
			this.invalidate();
		}

		public __render__() {
			this._vNode = super.__render__() as VNode;
			(this._vNode.properties as VirtualDomProperties).domNode = domNode;
			return this._vNode;
		}

		private _getInitialProperties(properties: DomWrapperProperties): any {
			return Object.keys(properties).reduce((obj: any, key: string) => {
				const prop = properties[key];
				if (key === 'classes' || key === 'styles') {
					obj[key] = {};
				}
				else if (typeof prop === 'function') {
					obj[key] = prop;
				}
				else {
					obj[key] = undefined;
				}
				return obj;
			}, {});
		}

		protected render() {
			const properties = this._firstRender ? this._getInitialProperties(this.properties) : this.properties;
			properties.bind && delete properties.bind;
			return v(domNode.tagName, { ...properties, key: 'root' });
		}
	};
}

export default DomWrapper;
