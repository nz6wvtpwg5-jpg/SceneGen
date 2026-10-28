export default function PageHeading(props: {heading: string, subheading: string, buttonText?: string}) {
  return (
    <div className="page-heading-container flex flex-col gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="scene-kicker">Live operations</p>
        <h1 className="scene-title">{props.heading}</h1>
        <p className="scene-copy">{props.subheading}</p>
      </div>
      {props.buttonText && <button className="page-heading-button standard-button min-h-11 rounded-full bg-[#ff5a36] px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,90,54,0.2)] transition hover:bg-[#e54525]">{props.buttonText}</button>}
    </div>
  );
}
