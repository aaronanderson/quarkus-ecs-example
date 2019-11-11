import { LitElement, html, css, customElement, property } from 'lit-element';
import { render as litRender } from 'lit-html/lib/shady-render.js';
import { h, render, ComponentType, VNode, Attributes, ComponentChildren, RefObject, createRef, Component, Fragment } from "preact";
import { directive, NodePart, TemplateResult } from 'lit-html';
//import Button, { ButtonTypeMap } from '@material-ui/core/Button';
import { StylesProvider, jssPreset } from '@material-ui/styles';
import { create, Jss } from 'jss';
import { ThemeProvider, makeStyles, createMuiTheme } from '@material-ui/core/styles';
import { red } from '@material-ui/core/colors';
import { Grid, Typography, Button } from '@material-ui/core';

import CssBaseline from '@material-ui/core/CssBaseline';

import { Header } from './header';


const theme = createMuiTheme({

  palette: {
    primary: {
      main: '#71aeef',
      contrastText: '#fff'
    },
    secondary: {
      main: '#70ca8d',
      contrastText: '#fff',
    },
    error: {
      main: red.A400,
    },

    background: {
      default: "#0d1c2c"
    },
  }

});

const useStyles = makeStyles(theme => ({
	
	hello: {
		margin: theme.spacing(2),
	}
}));


interface ExampleHello {
  name: string;
  env: string;
}


@customElement('quarkus-ecs-example')
export class QuarkusECSExampleElement extends LitElement {

  @property({ type: String })
  title = '';

  @property({ type: String })
  userName = '';

  @property({ type: String })
  env = '';

  headerRef: RefObject<Header> = createRef();

  styleMount = document.createElement("noscript");


  static get styles() {

    return [css`
      :host {
        color:  var(--quarkus-ecs-example, red);        
      }`];
  }


  firstUpdated() {
    //    let timerId = setInterval(() => this.headerRef.current && this.headerRef.current.test(), 2000);
    this.getUserAsync();
  }



  async getUserAsync() {
    try {
      let response = await fetch(`/api/example/hello`);
      let details: ExampleHello = await response.json();
      this.userName = details.name;
      this.env = details.env;
      console.log(details);

    } catch (err) {
      console.error(err);
    }
  }





  render() {    
    let fonts = html`${this.fontsTemplate}`;
    let content = html`${this.contentTemplate}`;
    let page = html`${reactVNode(this.pageTemplate(content))}`;

    return html`${fonts} ${this.styleMount} ${page}`;
  }

  get fontsTemplate() {
    return html`
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
  `;
  }

  get contentTemplate() {
    return html`
      <slot></slot>  
      <div>User Environment: ${this.env}</div>
      <div>User Name: ${this.userName} </div>      
  `;
  }


  pageTemplate(content: TemplateResult) {
    let jss: Jss = create({
      ...jssPreset(),
      //   insertionPoint: this.shadowRoot ? this.shadowRoot.getElementById('jss-insertion-point') as HTMLElement : ""
      insertionPoint: this.styleMount
    });
    let classes = useStyles();

    return <CssBaseline>
      <StylesProvider jss={jss} children={[]}>
        <ThemeProvider theme={theme} children={[]} >
          <Header title={this.title} ref={this.headerRef} />
          <Grid container direction="column" justify="center" alignItems="center">
            <Grid item md={2} className={classes.hello}>
              <Typography variant="body1" gutterBottom>
                <LitHTML template={content} target={this} />
              </Typography>
            </Grid>
            <Grid item md={2} className={classes.hello}>
              <Button variant="contained" color="secondary" onClick={e => this.handleRefresh()}>Refresh</Button>
            </Grid>
          </Grid>
        </ThemeProvider>
      </StylesProvider>
    </CssBaseline>



  }

  handleRefresh() {
    this.getUserAsync();
    if (this.headerRef.current) {
      this.headerRef.current.refresh();
    }
  }

}



//https://reactjs.org/docs/rendering-elements.html#updating-the-rendered-element
//https://preactjs.com/guide/v10/refs/#callback-refs
//example return html`${fonts} ${this.styleMount} ${reactElement(StylesProvider as ComponentType<any>, syleRef, { jss: jss }, h(Header, { title: this.title }))}`;
export const reactElement =
  directive(<P, C>(
    type: ComponentType<P>,
    ref: RefObject<C> | null,
    props: Attributes & P | null,
    ...children: ComponentChildren[]
  ) => (part: NodePart) => {
    let vNode: VNode = h(type, props, children);
    vNode.ref = ref;
    let mountPoint: DocumentFragment = new DocumentFragment();
    render(vNode, mountPoint);


    part.setValue(mountPoint);
  });

//Ensure web component file has .tsx file extension so that it inline elements are identified as JSX
export const reactVNode =
  directive(<C extends {}>(
    vNode: VNode<C>,
    ref?: RefObject<C>,
  ) => (part: NodePart) => {
    vNode.ref = ref ? ref : null;
    let mountPoint: DocumentFragment = new DocumentFragment();
    render(vNode, mountPoint);
    part.setValue(mountPoint);
  });


interface LitHTMLProps {
  template: TemplateResult;
  target: LitElement;
}

//https://github.com/preactjs/preact/wiki/External-DOM-Mutations 
class LitHTML extends Component<LitHTMLProps, {}> {

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    if (this.base) {
      litRender(this.props.template, this.base.parentNode as Element, { eventContext: this.props.target, scopeName: this.props.target.localName });
    }
  }

  componentWillUnmount() {
    // TODO find out if needed.
  }

  render() {
    //Fragment won't work, but rendering to base parent filters out this empty div node.
    return h("div", {});
  }
}