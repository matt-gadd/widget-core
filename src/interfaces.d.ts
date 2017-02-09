import { VNode, ProjectionOptions, VNodeProperties } from 'maquette';

/**
 * Generic constructor type
 */
export type Constructor<T> = new (...args: any[]) => T;

/**
 * Typed target event
 */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

/**
 * These interfaces are derived from Maquette.
 *
 * https://github.com/AFASSoftware/maquette
 *
 * Copyright (c) 2015 Maquette contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

export type ClassesFunction = () => {
	[index: string]: boolean | null | undefined;
}

/**
 * Object containing attributes, properties, event handlers and more that can be put on DOM nodes.
 *
 * For your convenience, all common attributes, properties and event handlers are listed here and are
 * type-checked when using Typescript.
 */
export interface HNodeProperties {
	/**
	 * The animation to perform when this node is added to an already existing parent.
	 * When this value is a string, you must pass a `projectionOptions.transitions` object when creating the
	 * projector using [[createProjector]].
	 * {@link http://maquettejs.org/docs/animations.html|More about animations}.
	 * @param element - Element that was just added to the DOM.
	 * @param properties - The properties object that was supplied to the [[h]] method
	 */
	enterAnimation?: ((element: Element, properties?: VNodeProperties) => void) | string;
	/**
	 * The animation to perform when this node is removed while its parent remains.
	 * When this value is a string, you must pass a `projectionOptions.transitions` object when creating the projector using [[createProjector]].
	 * {@link http://maquettejs.org/docs/animations.html|More about animations}.
	 * @param element - Element that ought to be removed from to the DOM.
	 * @param removeElement - Function that removes the element from the DOM.
	 * This argument is provided purely for convenience.
	 * You may use this function to remove the element when the animation is done.
	 * @param properties - The properties object that was supplied to the [[h]] method that rendered this [[VNode]] the previous time.
	 */
	exitAnimation?: ((element: Element, removeElement: () => void, properties?: VNodeProperties) => void) | string;
	/**
	 * The animation to perform when the properties of this node change.
	 * This also includes attributes, styles, css classes. This callback is also invoked when node contains only text and that text changes.
	 * {@link http://maquettejs.org/docs/animations.html|More about animations}.
	 * @param element - Element that was modified in the DOM.
	 * @param properties - The last properties object that was supplied to the [[h]] method
	 * @param previousProperties - The previous properties object that was supplied to the [[h]] method
	 */
	updateAnimation?: (element: Element, properties?: VNodeProperties, previousProperties?: VNodeProperties) => void;
	/**
	 * Callback that is executed after this node is added to the DOM. Childnodes and properties have
	 * already been applied.
	 * @param element - The element that was added to the DOM.
	 * @param projectionOptions - The projection options that were used see [[createProjector]].
	 * @param vnodeSelector - The selector passed to the [[h]] function.
	 * @param properties - The properties passed to the [[h]] function.
	 * @param children - The children that were created.
	 */
	afterCreate?(element: Element, projectionOptions: ProjectionOptions, vnodeSelector: string, properties: VNodeProperties,
	children: VNode[]): void;
	/**
	 * Callback that is executed every time this node may have been updated. Childnodes and properties
	 * have already been updated.
	 * @param element - The element that may have been updated in the DOM.
	 * @param projectionOptions - The projection options that were used see [[createProjector]].
	 * @param vnodeSelector - The selector passed to the [[h]] function.
	 * @param properties - The properties passed to the [[h]] function.
	 * @param children - The children for this node.
	 */
	afterUpdate?(element: Element, projectionOptions: ProjectionOptions, vnodeSelector: string, properties: VNodeProperties,
	children: VNode[]): void;
	/**
	 * When specified, the event handlers will be invoked with 'this' pointing to the value.
	 * This is useful when using the prototype/class based implementation of Components.
	 *
	 * When no [[key]] is present, this object is also used to uniquely identify a DOM node.
	 */
	readonly bind?: Object;
	/**
	 * Used to uniquely identify a DOM node among siblings.
	 * A key is required when there are more children with the same selector and these children are added or removed dynamically.
	 * NOTE: this does not have to be a string or number, a [[Component]] Object for instance is also possible.
	 */
	readonly key?: Object;
	/**
	 * An object literal like `{important:true}` which allows css classes, like `important` to be added and removed
	 * dynamically.
	 */
	readonly classes?: {
		[index: string]: boolean | null | undefined;
	} | ClassesFunction;
	/**
	 * An object literal like `{height:'100px'}` which allows styles to be changed dynamically. All values must be strings.
	 */
	readonly styles?: { [index: string]: string | null | undefined };

	// From Element
	ontouchcancel?(ev?: TouchEvent): boolean | void;
	ontouchend?(ev?: TouchEvent): boolean | void;
	ontouchmove?(ev?: TouchEvent): boolean | void;
	ontouchstart?(ev?: TouchEvent): boolean | void;
	// From HTMLFormElement
	readonly action?: string;
	readonly encoding?: string;
	readonly enctype?: string;
	readonly method?: string;
	readonly name?: string;
	readonly target?: string;
	// From HTMLElement
	onblur?(ev?: FocusEvent): boolean | void;
	onchange?(ev?: Event): boolean | void;
	onclick?(ev?: MouseEvent): boolean | void;
	ondblclick?(ev?: MouseEvent): boolean | void;
	onfocus?(ev?: FocusEvent): boolean | void;
	oninput?(ev?: Event): boolean | void;
	onkeydown?(ev?: KeyboardEvent): boolean | void;
	onkeypress?(ev?: KeyboardEvent): boolean | void;
	onkeyup?(ev?: KeyboardEvent): boolean | void;
	onload?(ev?: Event): boolean | void;
	onmousedown?(ev?: MouseEvent): boolean | void;
	onmouseenter?(ev?: MouseEvent): boolean | void;
	onmouseleave?(ev?: MouseEvent): boolean | void;
	onmousemove?(ev?: MouseEvent): boolean | void;
	onmouseout?(ev?: MouseEvent): boolean | void;
	onmouseover?(ev?: MouseEvent): boolean | void;
	onmouseup?(ev?: MouseEvent): boolean | void;
	onmousewheel?(ev?: WheelEvent | MouseWheelEvent): boolean | void;
	onscroll?(ev?: UIEvent): boolean | void;
	onsubmit?(ev?: Event): boolean | void;
	readonly spellcheck?: boolean;
	readonly tabIndex?: number;
	readonly disabled?: boolean;
	readonly title?: string;
	readonly accessKey?: string;
	readonly id?: string;
	// From HTMLInputElement
	readonly type?: string;
	readonly autocomplete?: string;
	readonly checked?: boolean;
	readonly placeholder?: string;
	readonly readOnly?: boolean;
	readonly src?: string;
	readonly value?: string;
	// From HTMLImageElement
	readonly alt?: string;
	readonly srcset?: string;
	/**
	 * Puts a non-interactive piece of html inside the DOM node.
	 *
	 * Note: if you use innerHTML, maquette cannot protect you from XSS vulnerabilities and you must make sure that the innerHTML value is safe.
	 */
	readonly innerHTML?: string;

	/**
	 * Everything that is not explicitly listed (properties and attributes that are either uncommon or custom).
	 */
	readonly [index: string]: any;
}

/*
 These are the event handlers exposed by Maquette.
 */

export type EventHandlerResult = boolean | void;

export interface EventHandler {
	(event?: Event): EventHandlerResult;
}

export interface FocusEventHandler {
	(event?: FocusEvent): EventHandlerResult;
}

export interface KeyboardEventHandler {
	(event?: KeyboardEvent): EventHandlerResult;
}

export interface MouseEventHandler {
	(event?: MouseEvent): EventHandlerResult;
}

export type BlurEventHandler = FocusEventHandler;
export type ChangeEventHandler = EventHandler;
export type ClickEventHandler = MouseEventHandler;
export type DoubleClickEventHandler = MouseEventHandler;
export type InputEventHandler = EventHandler;
export type KeyDownEventHandler = KeyboardEventHandler;
export type KeyPressEventHandler = KeyboardEventHandler;
export type KeyUpEventHandler = KeyboardEventHandler;
export type LoadEventHandler = EventHandler;
export type MouseDownEventHandler = MouseEventHandler;
export type MouseEnterEventHandler = MouseEventHandler;
export type MouseLeaveEventHandler = MouseEventHandler;
export type MouseMoveEventHandler = MouseEventHandler;
export type MouseOutEventHandler = MouseEventHandler;
export type MouseOverEventHandler = MouseEventHandler;
export type MouseUpEventHandler = MouseEventHandler;
export type MouseWheelEventHandler = (event?: MouseWheelEvent | WheelEvent) => EventHandlerResult;
export type ScrollEventHandler = (event?: UIEvent) => EventHandlerResult;
export type SubmitEventHandler = EventHandler;
