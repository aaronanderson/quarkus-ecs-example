import { h, render } from "preact";
import { QuarkusECSExampleElement } from "./app/quarkus-ecs-example";


const appMount = document.querySelector("#quarkus-ecs-example-container");
if (appMount) {

  const appRender = () => render(
    <quarkus-ecs-example title="Quarkus ECS Example">
      <div>Quarkus is Online!</div>
    </quarkus-ecs-example>,
    appMount);
  if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept('./app/quarkus-ecs-example', appRender);
  }
  appRender();
}



export default QuarkusECSExampleElement;
