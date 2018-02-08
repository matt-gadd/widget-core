import { DomWrapper } from './util/DomWrapper';
import { WidgetBase } from './WidgetBase';
import { ProjectorMixin } from './mixins/Projector';
import { from, findIndex } from '@dojo/shim/array';
import { w } from './d';

declare namespace customElements {
	function define(name: string, constructor: any): void;
}

export function create(descriptor: any, attributeMap: any, WidgetConstructor: any) {
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

			from(this.children).forEach((childNode: Node) => {
				childNode.addEventListener('render', () => this._render());
				childNode.addEventListener('connected', () => this._render());
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

			const observer = new MutationObserver((mutationsList: any) => this._updateChildren(mutationsList));
			observer.observe(this, { childList: true });

			this._initialised = true;
			this.dispatchEvent(
				new CustomEvent('connected', {
					bubbles: false,
					detail: this
				})
			);
		}

		private _updateChildren(mutationsList: any) {
			for (let mutation of mutationsList) {
				const { addedNodes } = mutation;
				for (let i = 0; i < addedNodes.length; i++) {
					const node = addedNodes[i];
					/*if (node.isWidget && node.parentNode === this) {
						this._children.push(DomWrapper(node as HTMLElement));
					}*/
					if (node.isWidget && node.parentNode === this) {
						const children = from(this.children);
						let previousSibling: any;
						for (let n = 0; n < children.length; n++) {
							const target = children[n];
							if (target === node) {
								previousSibling = children[Math.max(0, n - 1)];
								break;
							}
						}
						const previousIndex = findIndex(
							this._children,
							(child: any) => child.domNode === previousSibling
						);
						this._children.splice(previousIndex + 1, 1, DomWrapper(node as HTMLElement));
					}
				}
			}
			this._render();
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
			return this._children.filter((Child) => Child.domNode).map((Child: any) => {
				const domNode = Child.domNode;
				const properties = domNode.__properties__();
				const children = domNode.__children__();
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

	const { attributes } = descriptor;
	const attributeMap: any = {};

	attributes.forEach((propertyName: string) => {
		const attributeName = propertyName.toLowerCase();
		attributeMap[attributeName] = propertyName;
	});

	customElements.define(descriptor.tagName, create(descriptor, attributeMap, WidgetConstructor));
}

export default register;
