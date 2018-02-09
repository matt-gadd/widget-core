import { DomWrapper } from './util/DomWrapper';
import { WidgetBase } from './WidgetBase';
import { ProjectorMixin } from './mixins/Projector';
import { from } from '@dojo/shim/array';
import { w } from './d';
import global from '@dojo/shim/global';

export function create(descriptor: any, WidgetConstructor: any) {
	const { attributes } = descriptor;
	const attributeMap: any = {};

	attributes.forEach((propertyName: string) => {
		const attributeName = propertyName.toLowerCase();
		attributeMap[attributeName] = propertyName;
	});
	return class extends HTMLElement {
		private _projector: any;
		private _properties: any = {};
		private _children: any[] = [];
		private _initialised = false;

		public connectedCallback() {
			if (this._initialised) {
				return;
			}

			const domProperties: any = {};
			const { attributes, properties, events } = descriptor;

			this._properties = { ...this._properties, ...this._attributesToProperties(attributes) };

			[...attributes, ...properties].forEach((propertyName: string) => {
				const value = (this as any)[propertyName];
				if (value !== undefined) {
					this._properties[propertyName] = value;
				}

				domProperties[propertyName] = {
					get: () => this._getProperty(propertyName),
					set: (value: any) => this._setProperty(propertyName, value)
				};
			});

			Object.defineProperties(this, domProperties);

			events.forEach((propertyName: string) => {
				const eventName = propertyName.replace(/^on/, '').toLowerCase();
				this._properties[propertyName] = (event: any) => {
					this.dispatchEvent(
						new CustomEvent(eventName, {
							bubbles: false,
							detail: event
						})
					);
				};
			});

			from(this.children).forEach((childNode: Node) => {
				childNode.addEventListener('dojo-ce-render', () => this._render());
				this._children.push(DomWrapper(childNode as HTMLElement));
			});

			this.addEventListener('dojo-ce-connected', (e: any) => this._childConnected(e));

			const widgetProperties = this._properties;
			const renderChildren = () => this.__children__();
			const Wrapper = class extends WidgetBase {
				render() {
					return w(WidgetConstructor, widgetProperties, renderChildren());
				}
			};
			const Projector = ProjectorMixin(Wrapper);
			this._projector = new Projector();
			this._projector.append(this);

			this._initialised = true;
			this.dispatchEvent(
				new CustomEvent('dojo-ce-connected', {
					bubbles: true,
					detail: this
				})
			);
		}

		private _childConnected(e: any) {
			const node = e.detail;
			if (node.parentNode === this) {
				const exists = this._children.some((child) => child.domNode === node);
				if (!exists) {
					node.addEventListener('dojo-ce-render', () => this._render());
					this._children.push(DomWrapper(node));
					this._render();
				}
			}
		}

		private _render() {
			if (this._projector) {
				this._projector.invalidate();
				this.dispatchEvent(
					new CustomEvent('dojo-ce-render', {
						bubbles: false,
						detail: event
					})
				);
			}
		}

		public __properties__() {
			return this._properties;
		}

		public __children__() {
			return this._children.filter((Child) => Child.domNode).map((Child: any) => {
				const domNode = Child.domNode;
				return w(Child, domNode.__properties__(), domNode.__children__());
			});
		}

		public attributeChangedCallback(name: string, oldValue: string | null, value: string | null) {
			const propertyName = attributeMap[name];
			this._setProperty(propertyName, value);
		}

		private _setProperty(propertyName: string, value: any) {
			this._properties[propertyName] = value;
			this._render();
		}

		private _getProperty(propertyName: string) {
			return this._properties[propertyName];
		}

		private _attributesToProperties(attributes: string[]) {
			return attributes.reduce((properties: any, propertyName: string) => {
				const attributeName = propertyName.toLowerCase();
				const value = this.getAttribute(attributeName);
				if (value !== null) {
					properties[propertyName] = value;
				}
				return properties;
			}, {});
		}

		static get observedAttributes() {
			return Object.keys(attributeMap);
		}

		public get isWidget() {
			return true;
		}
	};
}

export function register(WidgetConstructor: any) {
	const descriptor = WidgetConstructor.prototype.__customElementDescriptor;

	if (!descriptor) {
		throw new Error('cannot get descriptor');
	}

	global.customElements.define(descriptor.tagName, create(descriptor, WidgetConstructor));
}

export default register;
