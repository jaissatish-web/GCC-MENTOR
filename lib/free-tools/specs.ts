import type {Spec} from './types'
import {getResumeSpec} from './calculations/resume'
export function getSpec(id:number):Spec|undefined {return getResumeSpec(id)}
