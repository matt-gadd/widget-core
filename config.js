SystemJS.config({
	transpiler: "ts",
	typescriptOptions: {
		"module": "system",
		"noImplicitAny": false,
		"typeCheck": false,
		"tsconfig": true
	},
	packages: {
		"ts": {
			"main": "plugin.js"
		},
		"typescript": {
			"main": "lib/typescript.js",
			"meta": {
				"lib/typescript.js": {
					"exports": "ts"
				}
			}
		},
		"maquette": {
			"defaultExtension": "ts",
			"main": "maquette.ts",
			"meta": {
				"*.ts": {
					"loader": "ts"
				}
			}
		},
		"dojo-compose": {
			"defaultExtension": "ts",
			"main": "main.ts",
			"meta": {
				"*.ts": {
					"loader": "ts"
				}
			}
		},
		"dojo-loader": {
			"defaultExtension": "ts",
			"main": "loader.ts",
			"meta": {
				"*.ts": {
					"loader": "ts",
					"typings": false
				}
			}
		},
		"dojo-core": {
			"defaultExtension": "ts",
			"main": "main.ts",
			"meta": {
				"*.ts": {
					"loader": "ts"
				}
			}
		},
		"rxjs": {
			"meta": {
				"*.js": {
					"typings": true
				}
			}
		},
		"immutable": {
			"defaultExtension": "js",
			"meta": {
				"*.js": {
					"typings": true
				}
			}
		},
		"symbol-observable": {
			"defaultExtension": "js",
			"main": "index.js",
			"meta": {
				"*.js": {
					"typings": true
				}
			}
		},
		"src": {
			"defaultExtension": "ts",
			"main": "main.ts",
			"meta": {
				"*.ts": {
					"loader": "ts"
				}
			}
		}
	},
	map: {
		"ts": "node_modules/plugin-typescript/lib",
		"maquette": "node_modules/maquette/src",
		"dojo-compose": "node_modules/dojo-compose/src",
		"rxjs": "node_modules/rxjs",
		"symbol-observable": "node_modules/symbol-observable",
		"immutable": "node_modules/immutable/dist",
		"dojo-core": "node_modules/dojo-core/src",
		"dojo-loader": "node_modules/dojo-loader/src",
		"typescript": "node_modules/typescript"
	}
});
