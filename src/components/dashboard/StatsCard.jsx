
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const colorVariants = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: "text-blue-600"
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-700",
    icon: "text-green-600"
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    icon: "text-purple-600"
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-700",
    icon: "text-red-600"
  },
  gray: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    icon: "text-slate-600"
  }
};

export default function StatsCard({ title, value, icon: Icon, color = "blue", subtitle, onClick }) {
  const colorClasses = colorVariants[color] || colorVariants.blue;
  const isClickable = !!onClick;

  return (
    <Card 
      className={cn(
        "border-0 shadow-sm transition-all duration-200",
        isClickable ? "cursor-pointer hover:shadow-md hover:ring-2 hover:ring-blue-500/50" : "hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            colorClasses.bg
          )}>
            <Icon className={cn("w-6 h-6", colorClasses.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
