import { Card } from "@heroui/react";

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  className?: string;
}

export const FeatureCard = ({
  icon: Icon,
  title,
  description,
  className = "",
}: FeatureCardProps) => {
  return (
    <Card
      className={`p-5 bg-black/30 backdrop-blur-md border border-muted/15 ${className}`}
    >
      <Icon className="size-15 p-2 text-accent bg-accent/10 rounded-4xl" />
      <h3 className="font-bold text-white text-2xl">{title}</h3>
      <p className="text-muted">{description}</p>
    </Card>
  );
};
