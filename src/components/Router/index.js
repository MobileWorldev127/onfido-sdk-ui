import { h, Component } from 'preact'
import createHistory from 'history/createBrowserHistory'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import io from 'socket.io-client'

import { unboundActions, events } from '../../core'
import {sendScreen} from '../../Tracker'
import {wrapArray} from '../utils/array'
import { createComponentList } from './StepComponentMap'

const history = createHistory()


const Router = (props) => {
  return (
    //TODO more robust way of detecting whether we are mobile or desktop
    window.location.pathname.length !== 7 ? <DesktopRouter {...props}/> : <MobileRouter {...props}/>
  )
}

class MobileRouter extends Component {

  constructor(props) {
    super(props)
    this.state = {
      token: null,
      steps: null,
      socket: io(process.env.DESKTOP_SYNC_URL),
      roomId: window.location.pathname.substring(1),
    }
    this.state.socket.on('config', this.setConfig(props.actions))
    this.state.socket.emit('join', {room: this.state.roomId})
    this.requestConfig()
  }

  requestConfig = () => {
    console.log(this.state.roomId)
    this.state.socket.emit('get config', {room: this.state.roomId})
  }

  setConfig = (actions) => {
    return (data) => {
      const {token, steps, documentType} = data.config
      this.setState({token, steps})
      actions.setDocumentType(documentType)
    }
  }

  render = (props) => {
    props.options.token = this.state.token
    props.options.steps = this.state.steps
    return (
      this.state.token ? <StepsRouter {...props}/> : <p>LOADING</p>
    )
  }


}

class DesktopRouter extends Component {

  constructor(props) {
    super(props)
    this.state = {
      roomId: null,
      socket: io(process.env.DESKTOP_SYNC_URL),
      mobileConnected: false,
    }
    this.state.socket.on('joined', this.setRoomId)
    this.state.socket.on('get config', this.sendConfig)
    this.state.socket.emit('join', {})
  }

  setRoomId = (data) => {
    this.setState({roomId: data.roomId})
    console.log(`https://localhost:8080/${data.roomId}`)
  }

  sendConfig = () => {
    const {documentType, options} = this.props
    const {steps, token} = options
    const config = {steps, token, documentType}
    this.state.socket.emit('config', {config, room: this.state.roomId})
    this.setState({mobileConnected: true})
  }

  render = (props) =>
    <StepsRouter {...props}/>
}


class StepsRouter extends Component {
  constructor(props) {
    super(props)
    this.state = {
      step: 0,
      componentsList: this.createComponentListFromProps(this.props),
    }
    this.unlisten = history.listen(({state = this.initialState}) => {
      this.setState(state)
    })
  }

  nextStep = () => {
    const components = this.state.componentsList
    const currentStep = this.state.step
    const newStepIndex = currentStep + 1
    if (components.length === newStepIndex){
      events.emit('complete')
    }
    else {
      this.setStepIndex(newStepIndex)
    }
  }

  finalStep = () => {
    const components = this.state.componentsList
    this.setStepIndex(components.length - 1)
  }

  previousStep = () => {
    const currentStep = this.state.step
    this.setStepIndex(currentStep - 1)
  }

  setStepIndex = (newStepIndex) => {
    const state = { step: newStepIndex }
    const path = `${location.pathname}${location.search}${location.hash}`
    history.push(path, state)
  }

  trackScreen = (screenNameHierarchy, properties = {}) => {
    const { step } = this.currentComponent()
    sendScreen(
      [step.type, ...wrapArray(screenNameHierarchy)],
      {...properties, ...step.options})
  }

  currentComponent = () => this.state.componentsList[this.state.step]

  componentWillReceiveProps(nextProps) {
    const componentsList = this.createComponentListFromProps(nextProps)
    this.setState({componentsList})
  }

  componentWillMount () {
    this.setStepIndex(this.state.step)
  }

  componentWillUnmount () {
    this.unlisten()
  }

  createComponentListFromProps = ({documentType, options:{steps}}) =>
    createComponentList(steps, documentType)

  render = ({options: {...globalUserOptions}, ...otherProps}) => {
    const componentBlob = this.currentComponent()
    const CurrentComponent = componentBlob.component
    return (
      <div>
        <CurrentComponent
          {...{...componentBlob.step.options, ...globalUserOptions, ...otherProps}}
          nextStep = {this.nextStep}
          previousStep = {this.previousStep}
          finalStep = {this.finalStep}
          trackScreen = {this.trackScreen}/>
      </div>
    )
  }
}


function mapStateToProps(state) {
  return {...state.globals}
}

function mapDispatchToProps(dispatch) {
  return { actions: bindActionCreators(unboundActions, dispatch) }
}

export default connect(mapStateToProps, mapDispatchToProps)(Router)
