import { Handle } from '@dojo/interfaces/core';
import global from '@dojo/core/global';
import Promise from '@dojo/shim/Promise';
import WeakMap from '@dojo/shim/WeakMap';
import Map from '@dojo/shim/Map';
import { dom, Projection, ProjectionOptions, VNodeProperties } from 'maquette';
import { WidgetBase } from './../WidgetBase';
import { Constructor, WidgetProperties } from './../interfaces';
import cssTransitions from '../animations/cssTransitions';

/**
 * Represents the attach state of the projector
 */
export enum ProjectorAttachState {
	Attached = 1,
	Detached
};

/**
 * Attach type for the projector
 */
export enum AttachType {
	Append = 1,
	Merge = 2,
	Replace = 3
};

export interface AttachOptions {

	/**
	 * If `'append'` it will append to the root. If `'merge'` it will merge with the root. If `'replace'` it will
	 * replace the root.
	 */
	type: AttachType;

	/**
	 * Element to attach the projector.
	 */
	root?: Element;
}

export interface ProjectorMixin {

	/**
	 * Append the projector to the root.
	 */
	append(root?: Element): Promise<Handle>;

	/**
	 * Merge the projector onto the root.
	 */
	merge(root?: Element): Promise<Handle>;

	/**
	 * Replace the root with the projector node.
	 */
	replace(root?: Element): Promise<Handle>;

	/**
	 * Pause the projector.
	 */
	pause(): void;

	/**
	 * Resume the projector.
	 */
	resume(): void;

	/**
	 * Schedule a render.
	 */
	scheduleRender(): void;

	/**
	 * Root element to attach the projector
	 */
	root: Element;

	/**
	 * The status of the projector
	 */
	readonly projectorState: ProjectorAttachState;
}

export interface EventIntercepterItem {
	handler: Function;
	properties: VNodeProperties;
}

export function ProjectorMixin<T extends Constructor<WidgetBase<WidgetProperties>>>(base: T): T & Constructor<ProjectorMixin> {
	return class extends base {

		public projectorState: ProjectorAttachState;

		private _root: Element;
		private attachPromise: Promise<Handle>;
		private attachHandle: Handle;
		private afterCreate: (...args: any[]) => void;
		private originalAfterCreate?: () => void;
		private projectionOptions: ProjectionOptions;
		private projection: Projection | undefined;
		private rendered: boolean;
		private scheduled: number | undefined;
		private paused: boolean;
		private boundDoRender: FrameRequestCallback;
		private boundRender: Function;
		private eventIntercepterNodeMap: WeakMap<Node, Map<string, EventIntercepterItem>>;

		constructor(...args: any[]) {
			super(...args);

			this.eventIntercepterNodeMap = new WeakMap<Node, Map<string, EventIntercepterItem>>();
			this.projectionOptions = {
				transitions: cssTransitions,
				eventHandlerInterceptor: this.eventHandlerInterceptor.bind(this)
			};

			this.boundDoRender = this.doRender.bind(this);
			this.boundRender = this.__render__.bind(this);

			this.own(this.on('widget:children', this.invalidate));
			this.own(this.on('invalidated', this.scheduleRender));

			this.root = document.body;
			this.rendered = true;
			this.projectorState = ProjectorAttachState.Detached;
		}

		append(root?: Element) {
			const options = {
				type: AttachType.Append,
				root
			};

			return this.attach(options);
		}

		merge(root?: Element) {
			const options = {
				type: AttachType.Merge,
				root
			};

			return this.attach(options);
		}

		replace(root?: Element) {
			const options = {
				type: AttachType.Replace,
				root
			};

			return this.attach(options);
		}

		pause() {
			if (this.scheduled) {
				global.cancelAnimationFrame(this.scheduled);
				this.scheduled = undefined;
			}
			this.paused = true;
		}

		resume() {
			this.paused = false;
			this.rendered = true;
			this.scheduleRender();
		}

		scheduleRender() {
			if (this.projectorState === ProjectorAttachState.Attached && !this.scheduled && !this.paused) {
				this.emit({
					type: 'render:scheduled',
					target: this
				});
				this.scheduled = global.requestAnimationFrame(this.boundDoRender);
			}
		}

		set root(root: Element) {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot change root element');
			}
			this._root = root;
		}

		get root(): Element {
			return this._root;
		}

		__render__() {
			const result = super.__render__();
			if (typeof result === 'string' || result === null) {
				throw new Error('Must provide a VNode at the root of a projector');
			}
			const { afterCreate } = this;
			if (result.properties) {
				if (result.properties.afterCreate) {
					this.originalAfterCreate = <any> result.properties.afterCreate;
				}

				result.properties.afterCreate = afterCreate;
			}

			return result;
		}

		private eventHandlerInterceptor(propertyName: string, callback: Function, domNode: Node, properties: VNodeProperties) {
			const eventName = propertyName.substr(2);
			let eventMap = this.eventIntercepterNodeMap.get(domNode);

			if (!eventMap) {
				eventMap = new Map<string, EventIntercepterItem>();
			}
			const eventItem = eventMap.get(eventName);

			if (!eventItem) {
				domNode.addEventListener(eventName, this.eventHandler.bind(this, eventMap));
			}
			eventMap.set(eventName, { handler: callback, properties });
		}

		private eventHandler(eventMap: Map<string, EventIntercepterItem>, evt: Event) {
			const item = eventMap.get(evt.type);
			if (item) {
				const { handler, properties } = item;
				return handler.apply(properties.bind || properties, [ evt ]);
			}
		}

		private doRender() {
			this.scheduled = undefined;

			if (!this.rendered) {
				return;
			}
			this.rendered = false;

			if (this.projection) {
				this.projection.update(this.boundRender());
			}
			this.rendered = true;
		}

		private attach({ type, root }: AttachOptions) {
			if (root) {
				this.root = root;
			}

			if (this.projectorState === ProjectorAttachState.Attached) {
				return this.attachPromise || Promise.resolve({});
			}

			this.projectorState = ProjectorAttachState.Attached;

			this.attachHandle = this.own({
				destroy: () => {
					if (this.projectorState === ProjectorAttachState.Attached) {
						this.pause();
						this.projection = undefined;
						this.projectorState = ProjectorAttachState.Detached;
					}
					this.attachHandle = { destroy() { } };
				}
			});

			this.attachPromise = new Promise((resolve, reject) => {
				this.afterCreate = (...args: any[]) => {
					if (this.originalAfterCreate) {
						const [ , , , properties ] = args;
						this.originalAfterCreate.apply(properties.bind || properties, args);
					}

					this.emit({
						type: 'projector:attached',
						target: this
					});
					resolve(this.attachHandle);
				};
			});

			switch (type) {
				case AttachType.Append:
					this.projection = dom.append(this.root, this.boundRender(), this.projectionOptions);
				break;
				case AttachType.Merge:
					this.projection = dom.merge(this.root, this.boundRender(), this.projectionOptions);
				break;
				case AttachType.Replace:
					this.projection = dom.replace(this.root, this.boundRender(), this.projectionOptions);
				break;
			}

			return this.attachPromise;
		}
	};
}

export default ProjectorMixin;
