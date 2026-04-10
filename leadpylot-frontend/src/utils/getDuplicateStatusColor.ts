export default function getDuplicateStatusColor(status: any) {
  switch (status) {
    case 0:
      return 'bg-evergreen';
    case 1:
      return 'bg-sunbeam-2';
    case 2:
      return 'bg-rust';
    default:
      return 'bg-sunbeam-2';
  }
}
