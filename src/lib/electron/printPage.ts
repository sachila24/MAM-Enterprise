/** Desktop uses Electron print dialog; browser keeps window.print(). */
export function printPage(): void {
  const bridge = window.mamElectron;
  if (bridge?.print) {
    void bridge.print().catch(() => {
      window.print();
    });
    return;
  }
  window.print();
}
