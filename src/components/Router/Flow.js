import { h, Component } from 'preact'

import { events } from '../../core'
import {sendScreen} from '../../Tracker'
import {wrapArray} from '../utils/array'

class Flow extends Component {
  constructor(props) {
    super(props)
    this.state = {
      step: this.props.step,
      componentsList: this.props.componentsList
    }
  }

  nextStep = () => {
    const components = this.state.componentsList
    const currentStep = this.state.step
    const newStepIndex = currentStep + 1
    if (components.length === newStepIndex){
      events.emit('complete')
    }
    else {
      this.props.setStepIndex(newStepIndex)
    }
  }

  previousStep = () => {
    const currentStep = this.state.step
    this.props.setStepIndex(currentStep - 1)
  }

  trackScreen = (screenNameHierarchy, properties = {}) => {
    const { step } = this.currentComponent()
    sendScreen(
      [step.type, ...wrapArray(screenNameHierarchy)],
      {...properties, ...step.options})
  }

  currentComponent = () => this.state.componentsList[this.state.step]

  componentWillReceiveProps() {
    const componentsList = this.props.componentsList
    this.setState({componentsList})
  }

  componentWillMount () {
    this.setStepIndex(this.state.step)
  }

  render = ({options: {...globalUserOptions}, ...otherProps}) => {
    const componentBlob = this.currentComponent()
    const CurrentComponent = componentBlob.component
    return (
      <div>
        <CurrentComponent
          {...{...componentBlob.step.options, ...globalUserOptions, ...otherProps}}
          nextStep = {this.nextStep}
          previousStep = {this.previousStep}
          trackScreen = {this.trackScreen}
        />
      </div>
    )
  }
}

export default Flow
