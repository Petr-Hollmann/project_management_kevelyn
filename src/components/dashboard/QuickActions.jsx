import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FolderOpen,
  Users,
  Car,
  TrendingUp,
  Plus
} from "lucide-react";

export default function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Rychlé akce
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link to={createPageUrl("Projects")}>
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nový projekt
          </Button>
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl("Workers")}>
            <Button variant="outline" className="w-full">
              <Users className="w-4 h-4 mr-2" />
              Montážníci
            </Button>
          </Link>
          <Link to={createPageUrl("Vehicles")}>
            <Button variant="outline" className="w-full">
              <Car className="w-4 h-4 mr-2" />
              Vozidla
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}