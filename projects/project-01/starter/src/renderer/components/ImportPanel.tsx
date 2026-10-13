interface Props { onImport: () => void; }
export function ImportPanel({ onImport }: Props) {
  return <button onClick={onImport}>导入 TXT / Markdown 文档</button>;
}
