import { h, Component, ClassAttributes } from "preact";
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';




const useStyles = makeStyles(theme => ({
	root: {
		flexGrow: 1,
	},
	count: {
		marginRight: theme.spacing(2),
	},
	title: {
		flexGrow: 1,
	},
}));



export interface HeaderProps extends ClassAttributes<Header> {
	title: string;
}

export interface HeaderState {
	count: number;
}



export class Header extends Component<HeaderProps, HeaderState> {

	state = { count: 0 };

	classes = useStyles();

	public refresh() {
		this.setState({ count: this.state.count + 1 });
	}

	render() {
		return (
			<div className={this.classes.root}>
				<AppBar position="static">
					<Toolbar>
						<Typography variant="h6" className={this.classes.title}>
							{this.props.title}
						</Typography>
						<Typography variant="h6" className={this.classes.count}>
							Refresh Count: {this.state.count}
						</Typography>

					</Toolbar>
				</AppBar>
			</div>
		)
	}

}