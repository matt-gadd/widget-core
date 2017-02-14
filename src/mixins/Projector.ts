import global from '@dojo/core/global';
import Promise from '@dojo/shim/Promise';
import { dom, Projection } from 'maquette';
import { Handle } from '@dojo/interfaces/core';
import { WidgetConstructor, WidgetProperties } from './../WidgetBase';
import { Constructor } from './../interfaces';
import 'pepjs';

/**
 * Represents the state of the projector
 */
export enum ProjectorState {
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
}

export interface ProjectorProperties extends WidgetProperties {

	root?: Element;

	cssTransitions?: boolean;
}

export interface Projector {

	/**
	 * Append the projector to the root.
	 */
	append(): Promise<Handle>;

	/**
	 * Merge the projector onto the root.
	 */
	merge(): Promise<Handle>;

	/**
	 * Pause the projector.
	 */
	pause(): void;

	/**
	 * Resume the projector and schedule a re-render.
	 */
	resume(): void;

	/**
	 * Root element to attach the projector
	 */
	root: Element;

	/**
	 * The status of the projector
	 */
	readonly projectorState: ProjectorState;
}

export interface VNodeEvent {
	eventName: string;
	eventHandler: Function;
	properties: any;
}

export function ProjectorMixin<T extends WidgetConstructor>(base: T): T & Constructor<Projector> {
	return class extends base {

		public properties: ProjectorProperties;
		public projectorState: ProjectorState;

		private _root: Element;
		private attachPromise: Promise<Handle>;
		private attachHandle: Handle;
		private afterCreate: () => void;

		private paused: boolean;
		private scheduled: number | undefined;
		private renderCompleted: boolean;

		private projections: Projection[];
		private projectionOptions: { transitions?: any, eventHandlerInterceptor: any };
		private renderFunctions: Function[];
		private events: WeakMap<Node, Map<string, VNodeEvent>>;
		private rootEventNames: string[];
		private boundHandler: EventListener;
		private boundRender: FrameRequestCallback;

		constructor(...args: any[]) {
			super(...args);
			const [ properties ] = args;
			const { root = document.body, cssTransitions = false }  = properties;

			this.events = new WeakMap<Node, Map<string, VNodeEvent>>();
			this.rootEventNames = [];
			this.renderFunctions = [];
			this.projections = [];
			this.renderCompleted = true;
			this.projectionOptions = { eventHandlerInterceptor: this.eventHandlerInterceptor.bind(this) };
			this.boundRender = this.doRender.bind(this);
			this.boundHandler = this.eventHandler.bind(this);

			if (cssTransitions) {
				if (global.cssTransitions) {
					this.projectionOptions.transitions = global.cssTransitions;
				}
				else {
					throw new Error('Unable to create projector with css transitions enabled. Is the \'css-transition.js\' script loaded in the page?');
				}
			}

			this.own(this.on('widget:children', this.invalidate));
			this.own(this.on('invalidated', this.scheduleRender));

			this.root = root;
			this.projectorState = ProjectorState.Detached;
		}

		private eventHandlerInterceptor(propertyName: string, eventHandler: Function, domNode: Node, properties: any) {
			const eventName = propertyName.substr(2);

			if (this.rootEventNames.indexOf(eventName) < 0) {
				this.root.addEventListener(eventName, this.boundHandler);
				this.rootEventNames.push(eventName);
			}

			let map = this.events.get(domNode);
			if (!map) {
				map = new Map<string, VNodeEvent>();
			}
			map.set(eventName, { eventName, eventHandler, properties });
			this.events.set(domNode, map);
		}

		private eventHandler(evt: any) {
			let node;
			let handle;
			let eventMatches = false;
			let eventFired = false;

			while (node !== this.root) {
				node = node ? node.parentNode : evt.target;
				handle = this.events.get(node);
				eventMatches = handle && handle.get(evt.type) !== undefined;

				if (eventMatches) {
					const { properties, eventHandler } = handle.get(evt.type);
					let stopPropagation;
					evt.stopPropagation = () => {
						stopPropagation = true;
					};
					const eventResult = eventHandler.apply(properties.bind || properties, [ evt ]);
					eventFired = true;
					if (eventResult === false || stopPropagation === true) {
						break;
					}
				}
			}

			if (eventFired) {
				this.scheduleRender();
			}
		}

		append() {
			const options = {
				type: AttachType.Append
			};
			return this.attach(options);
		}

		merge() {
			const options = {
				type: AttachType.Merge
			};
			return this.attach(options);
		}

		pause() {
			if (this.scheduled) {
				cancelAnimationFrame(this.scheduled);
				this.scheduled = undefined;
			}
			this.paused = true;
		}

		resume() {
			this.paused = false;
			this.renderCompleted = true;
			this.scheduleRender();
		}

		set root(root: Element) {
			if (this.projectorState === ProjectorState.Attached) {
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
				result.properties.afterCreate = afterCreate;
			}

			return result;
		}

		private doRender() {
			this.scheduled = undefined;

			if (!this.renderCompleted) {
				return;
			}

			this.renderCompleted = false;

			for (let i = 0; i < this.projections.length; i++) {
				let updatedVnode = this.renderFunctions[i]();
				this.projections[i].update(updatedVnode);
			}

			this.renderCompleted = true;
		}

		private scheduleRender() {
			if (this.projectorState === ProjectorState.Attached) {
				this.emit({
					type: 'render:scheduled',
					target: this
				});

				if (!this.scheduled && !this.paused) {
					this.scheduled = requestAnimationFrame(this.boundRender);
				}
			}
		}

		private attach({ type }: AttachOptions) {
			const render = this.__render__.bind(this);

			if (this.projectorState === ProjectorState.Attached) {
				return this.attachPromise || Promise.resolve({});
			}

			this.projectorState = ProjectorState.Attached;

			this.attachHandle = this.own({
				destroy: () => {
					if (this.projectorState === ProjectorState.Attached) {
						this.pause();
						this.detach(render);
						this.removeEventListeners();
						this.projectorState = ProjectorState.Detached;
					}
					this.attachHandle = { destroy() { } };
				}
			});

			this.attachPromise = new Promise((resolve, reject) => {
				this.afterCreate = () => {
					this.emit({
						type: 'projector:attached',
						target: this
					});
					resolve(this.attachHandle);
				};
			});

			switch (type) {
				case AttachType.Append:
					this.projections.push(dom.append(this.root, render(), this.projectionOptions));
					this.renderFunctions.push(render);
				break;
				case AttachType.Merge:
					this.projections.push(dom.merge(this.root, render(), this.projectionOptions));
					this.renderFunctions.push(render);
				break;
			}

			return this.attachPromise;
		}

		private removeEventListeners() {
			this.rootEventNames.forEach((eventName) => {
				this.root.removeEventListener(eventName, this.boundHandler);
			});
			this.rootEventNames = [];
		}

		private detach(render: any) {
			for (let i = 0; i < this.renderFunctions.length; i++) {

				if (this.renderFunctions[i] === render) {
					this.renderFunctions.splice(i, 1);
					return this.projections.splice(i, 1)[0];
				}

			}
		}
	};
}
