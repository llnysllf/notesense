type StatTileProps = {
  label: string;
  value: string | number;
};

function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default StatTile;
