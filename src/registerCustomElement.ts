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
		throw new Error('failz');
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
			private _widgetProperties: any = {};
			private _widgetChildren: any[] = [];
			private _initialised = false;

			public connectedCallback() {
				if (this._initialised) {
					return;
				}
				const { attributes, properties, events } = descriptor;

				attributes.forEach((propertyName: string) => {
					const attributeName = propertyName.toLowerCase();
					const value = this.getAttribute(attributeName);
					if (value !== null) {
						this._widgetProperties[propertyName] = value;
					}
				});

				properties.forEach((propertyName: string) => {
					const value = (this as any)[propertyName];
					this._widgetProperties[propertyName] = value;
				});

				events.forEach((propertyName: string) => {
					const eventName = propertyName.replace(/^on/, '').toLowerCase();
					this._widgetProperties[propertyName] = (event: any) => {
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
					this._widgetChildren.push(DomWrapper(childNode as HTMLElement));
				});

				const widgetProperties = this._widgetProperties;
				const renderChildren = () => this._renderChildren();
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

			_renderChildren() {
				return this._widgetChildren.map((Child: any) => {
					let properties = {};
					let children = [];
					if (Child.domNode.widgetProperties) {
						properties = Child.domNode.widgetProperties;
					}
					if (Child.domNode.widgetChildren) {
						children = Child.domNode.widgetChildren;
					}
					return w(Child, properties, children);
				});
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

			public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
				const propertyName = attributeMap[name];
				this._widgetProperties[propertyName] = newValue;
				this._render();
			}

			public get widgetProperties() {
				return this._widgetProperties;
			}

			public get widgetChildren() {
				return this._renderChildren();
			}

			static get observedAttributes() {
				return Object.keys(attributeMap);
			}
		}
	);
}

export default registerCustomElement;
