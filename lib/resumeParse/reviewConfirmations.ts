/** Value-bound fingerprints shared by onboarding review and the saved-profile
 * review. Changing a fact invalidates its confirmation; raw facts are not stored. */
export async function confirmationDigest(scope:string,id:string,value:string):Promise<string>{
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([scope,id,value])))
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')
}
