"use client";

type AustraliaStateListProps = {
  onChange: (state: string) => void;
  value?: string;
  className?: string;
};

export default function AustraliaStateList({
  onChange,
  value,
  className,
}: AustraliaStateListProps) {
  return (
    <select
      id="state"
      name="state"
      className={className}
      onChange={(e) => onChange(e.target.value)}
      value={value}
    >
      <option value="">-</option>
      <option value="NSW">New South Wales</option>
      <option value="VIC">Victoria</option>
      <option value="QLD">Queensland</option>
      <option value="SA">South Australia</option>
      <option value="WA">Western Australia</option>
      <option value="TAS">Tasmania</option>
      <option value="ACT">Australian Capital Territory</option>
      <option value="NT">Northern Territory</option>
    </select>
  );
}
