import { DomWrapper } from './util/DomWrapper';
import { WidgetBase } from './WidgetBase';
import { ProjectorMixin } from './mixins/Projector';
import { from } from '@dojo/shim/array';
import { w } from './d';

declare namespace customElements {
	function define(name: string, constructor: any): void;
}

export function registerCustomElement(WidgetConstructor: any) {
	const descriptor = WidgetConstructor.prototype.__customElementDescriptor;
	if (!descriptor) {
		throw new Error('cannot get descriptor');
	}
	const { attributes } = descriptor;
	const attributeMap: any = {};

	attributes.forEach((propertyName: string) => {
		const attributeName = propertyName.toLowerCase();
		attributeMap[attributeName] = propertyName;
	});

	customElements.define(
		descriptor.tagName,
		class extends HTMLElement {
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

				properties.forEach((propertyName: string) => {
					const value = (this as any)[propertyName];
					this._properties[propertyName] = value;

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

				from(this.childNodes).forEach((childNode: Node) => {
					childNode.addEventListener('render', () => this._render());
					this._children.push(DomWrapper(childNode as HTMLElement));
				});

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
			}

			private _render() {
				if (this._projector) {
					this._projector.invalidate();
					this.dispatchEvent(
						new CustomEvent('render', {
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
				return this._children.map((Child: any) => {
					const domNode = Child.domNode;
					const properties = domNode.__properties__ ? domNode.__properties__() : {};
					const children = domNode.__children__ ? domNode.__children__() : [];
					return w(Child, properties, children);
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
		}
	);
}

export default registerCustomElement;
