"use client";

type CanadaProvinceListProps = {
  onChange: (province: string) => void;
  value?: string;
  className?: string;
};

export default function CanadaProvinceList({
  onChange,
  value,
  className,
}: CanadaProvinceListProps) {
  return (
    <select
      id="province"
      name="province"
      className={className}
      onChange={(e) => onChange(e.target.value)}
      value={value}
    >
      <option value="">-</option>
      <option value="AB">Alberta</option>
      <option value="BC">British Columbia</option>
      <option value="MB">Manitoba</option>
      <option value="NB">New Brunswick</option>
      <option value="NL">Newfoundland and Labrador</option>
      <option value="NS">Nova Scotia</option>
      <option value="ON">Ontario</option>
      <option value="PE">Prince Edward Island</option>
      <option value="QC">Quebec</option>
      <option value="SK">Saskatchewan</option>
    </select>
  );
}
