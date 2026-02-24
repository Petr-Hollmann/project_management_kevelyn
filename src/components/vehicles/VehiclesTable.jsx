import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, AlertTriangle, ExternalLink } from "lucide-react";
import { format, isBefore, addDays } from "date-fns";
import { cs } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const vehicleTypeLabels = {
  car: "Osobní",
  van: "Dodávka", 
  truck: "Nákladní",
  other: "Jiné"
};

const statusLabels = {
  active: "V provozu",
  inactive: "Mimo provoz",
  in_service: "V servisu"
};

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-red-100 text-red-800",
  in_service: "bg-yellow-100 text-yellow-800"
};

const getExpiryBadge = (date, label, isCard = false) => {
    if (!date) return null;
    const expiry = new Date(date);
    const now = new Date();
    const warning = addDays(now, 30);
    
    let status = "valid";
    if (isBefore(expiry, now)) status = "expired";
    else if (isBefore(expiry, warning)) status = "expiring";

    const colors = {
      expired: "bg-red-100 text-red-800",
      expiring: "bg-orange-100 text-orange-800", 
      valid: "bg-green-100 text-green-800"
    };

    const badge = (
        <Badge className={`${colors[status]} text-xs`}>
            {label}: {format(new Date(date), "d.M.yy", { locale: cs })}
        </Badge>
    );

    if (isCard) {
        return (
            <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{label}:</span>
                <Badge variant="outline" className={`${colors[status]} text-xs`}>
                    {format(new Date(date), "d.M.yy", { locale: cs })}
                </Badge>
            </div>
        );
    }
    
    return badge;
};

const VehicleCard = ({ vehicle, onEdit, onDelete, onViewDetail, isAdmin, checkExpiring }) => (
    <Card className="flex flex-col">
        <CardHeader>
            <CardTitle className="flex justify-between items-start gap-2 text-base">
                <Link to={createPageUrl(`VehicleDetail?id=${vehicle.id}`)} className="hover:underline min-w-0 truncate">
                    {vehicle.brand_model}
                </Link>
                {checkExpiring(vehicle) && <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />}
            </CardTitle>
            <p className="font-mono font-semibold text-slate-700">{vehicle.license_plate}</p>
        </CardHeader>
        <CardContent className="flex-grow space-y-3">
            <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Stav:</span>
                <Badge className={`${statusColors[vehicle.status]} text-xs`}>
                    {statusLabels[vehicle.status]}
                </Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Typ:</span>
                <span className="font-medium">{vehicleTypeLabels[vehicle.vehicle_type]}</span>
            </div>
            <div className="space-y-1 border-t pt-2 mt-2">
                {getExpiryBadge(vehicle.stk_expiry, "STK", true)}
                {getExpiryBadge(vehicle.insurance_expiry, "Pojištění", true)}
                {getExpiryBadge(vehicle.highway_sticker_expiry, "Dálniční známka", true)}
            </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 bg-slate-50 py-2 px-4 border-t">
            <Button variant="ghost" size="sm" onClick={() => onViewDetail(vehicle)}>
                <Eye className="w-4 h-4 mr-1" /> Detail
            </Button>
            {isAdmin && (
            <>
                <Button variant="ghost" size="sm" onClick={() => onEdit(vehicle)}>
                    <Edit className="w-4 h-4 mr-1" /> Upravit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(vehicle.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-1" /> Smazat
                </Button>
            </>
            )}
        </CardFooter>
    </Card>
);

export default function VehiclesTable({ vehicles, onEdit, onDelete, onViewDetail, isAdmin, checkExpiring }) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SPZ</TableHead>
              <TableHead>Vozidlo</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>Platnosti</TableHead>
              <TableHead>GPS</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{vehicle.license_plate}</span>
                    {checkExpiring(vehicle) && (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Link 
                    to={createPageUrl(`VehicleDetail?id=${vehicle.id}`)}
                    className="font-medium hover:text-blue-600 hover:underline"
                  >
                    {vehicle.brand_model}
                  </Link>
                </TableCell>
                <TableCell>{vehicleTypeLabels[vehicle.vehicle_type]}</TableCell>
                <TableCell>
                  <Badge className={statusColors[vehicle.status]}>
                    {statusLabels[vehicle.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getExpiryBadge(vehicle.stk_expiry, "STK")}
                    {getExpiryBadge(vehicle.insurance_expiry, "POJ")}
                    {getExpiryBadge(vehicle.highway_sticker_expiry, "DZ")}
                  </div>
                </TableCell>
                <TableCell>
                  {vehicle.gps_link && (
                    <a
                      href={vehicle.gps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onViewDetail(vehicle)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(vehicle)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(vehicle.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
          {vehicles.map((vehicle) => (
              <VehicleCard 
                  key={vehicle.id}
                  vehicle={vehicle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewDetail={onViewDetail}
                  isAdmin={isAdmin}
                  checkExpiring={checkExpiring}
              />
          ))}
      </div>
    </>
  );
}