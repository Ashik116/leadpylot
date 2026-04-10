export default function arrayIndexOf(one: any, ofTarget: any) {
  if (Array.isArray(ofTarget)) {
    return ofTarget.indexOf(one) >= 0;
  }
  return one === ofTarget;
}
