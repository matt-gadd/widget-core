import global from '@dojo/core/global';
import { Handle } from '@dojo/interfaces/core';
import { dom, Projection, VNodeProperties } from 'maquette';
import 'pepjs';
import cssTransitions from '../animations/cssTransitions';
import { Constructor, DNode, WidgetProperties } from './../interfaces';
import { WidgetBase } from './../WidgetBase';
import WeakMap from '@dojo/shim/WeakMap';
import Map from '@dojo/shim/Map';

/**
 * Represents the attach state of the projector
 */
export enum ProjectorAttachState {
	Attached = 1,
	Detached
}

/**
 * Attach type for the projector
 */
export enum AttachType {
	Append = 1,
	Merge = 2,
	Replace = 3
}

export interface AttachOptions {

	/**
	 * If `'append'` it will appended to the root. If `'merge'` it will merged with the root. If `'replace'` it will
	 * replace the root.
	 */
	type: AttachType;

	/**
	 * Element to attach the projector.
	 */
	root?: Element;
}

export interface ProjectorMixin<P extends WidgetProperties> {

	/**
	 * Append the projector to the root.
	 */
	append(root?: Element): Handle;

	/**
	 * Merge the projector onto the root.
	 */
	merge(root?: Element): Handle;

	/**
	 * Replace the root with the projector node.
	 */
	replace(root?: Element): Handle;

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
	 * Sets the properties for the widget. Responsible for calling the diffing functions for the properties against the
	 * previous properties. Runs though any registered specific property diff functions collecting the results and then
	 * runs the remainder through the catch all diff function. The aggregate of the two sets of the results is then
	 * set as the widget's properties
	 *
	 * @param properties The new widget properties
	 */
	setProperties(properties: P & { [index: string]: any }): void;

	/**
	 * Sets the widget's children
	 */
	setChildren(children: DNode[]): void;

	/**
	 * Root element to attach the projector
	 */
	root: Element;

	/**
	 * The status of the projector
	 */
	readonly projectorState: ProjectorAttachState;
}

export function ProjectorMixin<P, T extends Constructor<WidgetBase<P>>>(base: T): T & Constructor<ProjectorMixin<P>> {
	return class extends base {

		public projectorState: ProjectorAttachState;

		private _root: Element;
		private _attachHandle: Handle;
		private _projectionOptions: any;
		private _projection: Projection | undefined;
		private _scheduled: number | undefined;
		private _paused: boolean;
		private _boundDoRender: FrameRequestCallback;
		private _boundRender: Function;
		private _rootEventNames: string[] = [];
		private _boundHandler: any;

		private _events = new WeakMap<Element, Map<string, any>>();
		private _widgetMarkers = new WeakMap<Element, any>();

		constructor(...args: any[]) {
			super(...args);

			this._projectionOptions = {
				transitions: cssTransitions,
				eventHandlerInterceptor: this.eventHandlerInterceptor.bind(this),
				elementToBubbleTo: this._addElementToEventMap.bind(this)
			};

			this._boundDoRender = this.doRender.bind(this);
			this._boundRender = this.__render__.bind(this);

			this.own(this.on('widget:children', this.invalidate));
			this.own(this.on('properties:changed', () => {
				this.scheduleRender();
			}));
			this.own(this.on('invalidated', this.scheduleRender));

			this.root = document.body;
			this.projectorState = ProjectorAttachState.Detached;
			this._boundHandler = this.eventHandler.bind(this);
		}

		private _addElementToEventMap(element: Element) {
			this._widgetMarkers.set(element, true);
		}

		public append(root?: Element) {
			const options = {
				type: AttachType.Append,
				root
			};

			return this.attach(options);
		}

		public merge(root?: Element) {
			const options = {
				type: AttachType.Merge,
				root
			};

			return this.attach(options);
		}

		public replace(root?: Element) {
			const options = {
				type: AttachType.Replace,
				root
			};

			return this.attach(options);
		}

		public pause() {
			if (this._scheduled) {
				global.cancelAnimationFrame(this._scheduled);
				this._scheduled = undefined;
			}
			this._paused = true;
		}

		public resume() {
			this._paused = false;
			this.scheduleRender();
		}

		public scheduleRender() {
			if (this.projectorState === ProjectorAttachState.Attached && !this._scheduled && !this._paused) {
				this._scheduled = global.requestAnimationFrame(this._boundDoRender);
			}
		}

		public set root(root: Element) {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot change root element');
			}
			this._root = root;
		}

		public get root(): Element {
			return this._root;
		}

		public setChildren(children: DNode[]): void {
			super.__setChildren__(children);
		}

		public setProperties(properties: P & { [index: string]: any }): void {
			super.__setProperties__(properties);
		}

		public __render__() {
			const result = super.__render__();
			if (typeof result === 'string' || result === null) {
				throw new Error('Must provide a VNode at the root of a projector');
			}

			return result;
		}

		private eventHandlerInterceptor(propertyName: string, eventHandler: Function, domNode: Element, properties: VNodeProperties) {
			const eventName = propertyName.substr(2);

			if (this._rootEventNames.indexOf(eventName) < 0) {
				this.root.addEventListener(eventName, this._boundHandler);
				this._rootEventNames.push(eventName);
			}

			let map = this._events.get(domNode);
			if (!map) {
				map = new Map<string, any>();
			}
			map.set(eventName, { eventName, eventHandler, properties });
			this._events.set(domNode, map);
		}

		private eventHandler(evt: any) {
			let node;
			let handle;
			let eventMatches = false;
			let eventFired = false;

			while (node !== this.root) {
				let stopPropagation;

				node = node ? node.parentNode : evt.target;
				handle = this._events.get(node);
				stopPropagation = this._widgetMarkers.get(node);

				eventMatches = handle && handle.get(evt.type) !== undefined;

				if (eventMatches) {
					const { properties, eventHandler } = handle.get(evt.type);
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
		}

		private doRender() {
			this._scheduled = undefined;

			if (this._projection) {
				this._projection.update(this._boundRender());
			}
		}

		private attach({ type, root }: AttachOptions): Handle {
			if (root) {
				this.root = root;
			}

			if (this.projectorState === ProjectorAttachState.Attached) {
				return this._attachHandle;
			}

			this.projectorState = ProjectorAttachState.Attached;

			this._attachHandle = this.own({
				destroy: () => {
					if (this.projectorState === ProjectorAttachState.Attached) {
						this.pause();
						this._projection = undefined;
						this.projectorState = ProjectorAttachState.Detached;
					}
					this._attachHandle = { destroy() { } };
				}
			});

			switch (type) {
				case AttachType.Append:
					this._projection = dom.append(this.root, this._boundRender(), this._projectionOptions);
				break;
				case AttachType.Merge:
					this._projection = dom.merge(this.root, this._boundRender(), this._projectionOptions);
				break;
				case AttachType.Replace:
					this._projection = dom.replace(this.root, this._boundRender(), this._projectionOptions);
				break;
			}

			return this._attachHandle;
		}
	};
}

export default ProjectorMixin;
