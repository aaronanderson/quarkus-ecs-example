import { h } from "preact";

//Augment the preact module and add additional allowed element names.
import { JSXInternal as JSXI } from "preact/src/jsx";

declare module "preact" {

	export namespace JSXInternal {


  	interface IntrinsicElements extends JSXI.IntrinsicElements {
			["quarkus-ecs-example"]: Partial<HTMLElement> & {
        title: string
      };
		}
	}
}
