import { findIndex } from '@dojo/shim/array';

class Applicator {}

class Differ {}

function same(current, next) {
	return true;
}

interface Instruction {
	current: any;
	next: any;
}

class Processor {
	private _instructions = [];
	private _inProgress = false;
	_add(current, next) {
		const currentNodes = Array.isArray(current) ? current : [current];
		const nextNodes = Array.isArray(next) ? next : [next];
		const nextNodesToProcess = nextNodes.map(function(nextNode) {
			const index = findIndex(currentNodes, (currentNode) => same(currentNode, nextNode));
			if (index !== -1) {
				const currentNode = currentNodes[index];
				currentNodes.splice(index, 1);
				return [currentNode, nextNode];
			} else {
				return [undefined, nextNode];
			}
		});
		this._inProgress ? this._instructions.unshift(nextNodesToProcess) : this._instructions.push(nextNodesToProcess);
	}
	run() {
		this._inProgress = true;
		while (this._instructions.length) {
			const instruction = this._instructions.shift();
			this._execute(instruction);
		}
		this._inProgress = false;
	}
	_execute(instruction) {
		const { current, next } = instruction;
	}
}

export default class Renderer {
	private _processor = new Processor();
	private _differ = new Differ();
	private _applicator = new Applicator();

	append() {}
}
