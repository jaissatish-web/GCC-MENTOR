import type {Spec} from './types'
import {getGeneralSpec} from './calculations/general'
import {getResumeSpec} from './calculations/resume'
export function getSpec(id:number):Spec|undefined {return getResumeSpec(id)??getGeneralSpec(id)}
