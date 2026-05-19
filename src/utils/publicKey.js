/**
 * RSA Public Key for license signature verification
 *
 * IMPORTANT:
 * Replace this placeholder with your actual RSA public key.
 * Generate a keypair:
 *   1. openssl genrsa -out private.key 2048
 *   2. openssl rsa -in private.key -pubout -out public.key
 * Then paste the contents of public.key between the markers below.
 */

const _PUB = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAt3DQOlvVfRo15oP5gxVp
XlAfj8zDHeFR1ufZoeAP83UvaZi/6P6xVkl2YoO14oGOLgCTZ6tzZlGMoPkqXAev
0Czp6XNe7zH6+vVbGQr3SszMLxHSdkoNLnp1Ps03DFbksm201FIxNzHozoZ2/sO8
sXbmGfMlt00AQFJuwIib646KOCxb4p9NSEyGoi4yLn8CKjy0tJSshUtjoTzxbeIU
bd+abB8h7PFTZ6Udy6R53essJm5y0Ngq5BHolXRhpVA4LoJHx7+Mh/htnQEL4g3c
vpi5btAGnecYzf/G9xtuShOKJe2Kqffmsyg7E4rU8B671j5+t7hybE3paDzlytfU
GQIDAQAB
-----END PUBLIC KEY-----`;

export default _PUB;