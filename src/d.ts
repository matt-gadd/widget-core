import { assign } from '@dojo/core/lang';
import { VNodeProperties } from '@dojo/interfaces/vdom';
import Symbol from '@dojo/shim/Symbol';
import { h, VNode as MaquetteVNode } from 'maquette';
import {
	DNode,
	HNode,
	WNode,
	WidgetProperties,
	WidgetBase
} from './WidgetBase';
import FactoryRegistry from './FactoryRegistry';

/**
 * The symbol intifier for a WNode type
 */
export const WNODE = Symbol('Identifier for a WNode.');

/**
 * The symbol intifier for a HNode type
 */
export const HNODE = Symbol('Identifier for a HNode.');

/**
 * Helper function that returns true if the `DNode` is a `WNode` using the `type` property
 */
export function isWNode(child: DNode): child is WNode {
	return Boolean(child && (typeof child !== 'string') && child.type === WNODE);
}

/**
 * Helper function that returns true if the `DNode` is a `Node` using the `type` property
 */
export function isHNode(child: DNode): child is HNode {
	return Boolean(child && (typeof child !== 'string') && child.type === HNODE);
}

/**
 * Widget Base Constructor type with a generic for Widget Properties
 */
export type WidgetBaseConstructor<P extends WidgetProperties> = new (properties: P) => WidgetBase<P>

/**
 * Generic decorate function for DNodes. The nodes are modified in place based on the provided predicate
 * and modifier functions.
 *
 * The children of each node are flattened and added to the array for decoration.
 *
 * If no predicate is supplied then the modifier will be executed on all nodes.
 */
export function decorate(dNodes: DNode, modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode;
export function decorate(dNodes: DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode[];
export function decorate(dNodes: DNode | DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode | DNode[] {
	let nodes = Array.isArray(dNodes) ? [ ...dNodes ] : [ dNodes ];
	while (nodes.length) {
		const node = nodes.pop();
		if (node) {
			if (!predicate || predicate(node)) {
				modifier(node);
			}
			if ((isWNode(node) || isHNode(node)) && node.children) {
				nodes = [ ...nodes, ...node.children ];
			}
		}
	}
	return dNodes;
}

/**
 * Global factory registry instance
 */
export const registry = new FactoryRegistry();

/**
 * Wrapper function for calls to create a widget.
 */
export function w<P extends WidgetProperties>(factory: WidgetBaseConstructor<P> | string, properties: P): WNode;
export function w<P extends WidgetProperties>(factory: WidgetBaseConstructor<P> | string, properties: P, children?: DNode[]): WNode;
export function w<P extends WidgetProperties>(factory: WidgetBaseConstructor<P> | string, properties: P, children: DNode[] = []): WNode {

	return {
		children,
		factory,
		properties,
		type: WNODE
	};
}

/**
 * Wrapper function for calls to create hyperscript, lazily executes the hyperscript creation
 */
export function v(tag: string, properties: VNodeProperties, children?: DNode[]): HNode;
export function v(tag: string, children: DNode[]): HNode;
export function v(tag: string): HNode;
export function v(tag: string, propertiesOrChildren: VNodeProperties = {}, children: DNode[] = []): HNode {
		let properties = propertiesOrChildren;

		if (Array.isArray(propertiesOrChildren)) {
			children = propertiesOrChildren;
			properties = {};
		}

		return {
			vNodes: [],
			children,
			properties,
			render<T>(this: { vNodes: MaquetteVNode[], properties: VNodeProperties }, options: { bind?: T } = { }) {
				const { classes } = this.properties;
				if (typeof classes === 'function') {
					this.properties = assign(this.properties, { classes: classes() });
				}
				return h(tag, assign(options, this.properties), this.vNodes);
			},
			type: HNODE
		};
}
