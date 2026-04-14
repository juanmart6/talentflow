import { Link } from '@inertiajs/react';
import { Copy, Eye, Mail, MapPin, Pencil, Phone, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CENTER_STATUS_META } from '@/lib/education-centers/center-status';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import educationCenters from '@/routes/education-centers';

import type { CenterRow, CentersPagination } from '@/types/domains/education-centers';

type CenterTableProps = {
    centers: CentersPagination;
    hasRows: boolean;
    onCopyCenterData: (center: CenterRow) => void;
    onDeleteCenter: (center: CenterRow) => void;
    formatSpanishDate: (date: string | null) => string;
    centerStatusDetail: (center: CenterRow) => string;
};

export default function CenterTable({
    centers,
    hasRows,
    onCopyCenterData,
    onDeleteCenter,
    formatSpanishDate,
    centerStatusDetail,
}: CenterTableProps) {
    return (
        <div className={UI_PRESETS.tableContainer}>
            <table className="w-full min-w-[920px] table-fixed text-sm">
                <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[25%]" />
                    <col className="w-[20%]" />
                    <col className="w-[25%]" />
                </colgroup>
                <thead className={UI_PRESETS.tableHead}>
                    <tr>
                        <th className="px-4 py-3 text-center font-semibold">Centro</th>
                        <th className="px-4 py-3 text-center font-semibold">Convenio</th>
                        <th className="px-4 py-3 text-center font-semibold">Estado</th>
                        <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {hasRows ? (
                        centers.data.map((center, index) => (
                            <tr key={center.id} className={`h-24 border-t align-middle ${stripedRowClass(index)}`}>
                                <td className={`${UI_PRESETS.tableCellCentered} align-middle`}>
                                    <button
                                        type="button"
                                        className="inline-flex cursor-pointer items-center gap-1.5 font-semibold"
                                        onClick={() => onCopyCenterData(center)}
                                        title="Copiar datos del centro"
                                        aria-label="Copiar datos del centro"
                                    >
                                        <span>{center.name}</span>
                                        <Copy className="size-3 text-muted-foreground" />
                                    </button>
                                    <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                                        <Mail className="size-3" aria-hidden="true" />
                                        <span>{center.institutional_email}</span>
                                    </p>
                                    <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                                        <Phone className="size-3" aria-hidden="true" />
                                        <span>{center.phone}</span>
                                    </p>
                                </td>
                                <td className={`${UI_PRESETS.tableCellCentered} align-middle`}>
                                    {center.latest_agreement ? (
                                        <>
                                            <p className="text-sm font-semibold">
                                                Vence {formatSpanishDate(center.latest_agreement.expires_at)}
                                            </p>
                                            <p className="text-xs font-semibold text-muted-foreground">
                                                Plazas: {center.latest_agreement.agreed_slots ?? '-'}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-muted-foreground">Sin convenio registrado</p>
                                    )}
                                </td>
                                <td className={`${UI_PRESETS.tableCellCentered} align-middle`}>
                                    <span
                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${CENTER_STATUS_META[center.status].badgeClass}`}
                                    >
                                        {CENTER_STATUS_META[center.status].label}
                                    </span>
                                    <p className="mt-1 text-[11px] text-muted-foreground">{centerStatusDetail(center)}</p>
                                </td>
                                <td className={`${UI_PRESETS.tableCellCentered} align-middle`}>
                                    <div className="flex justify-center gap-2">
                                        {center.address && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className={UI_PRESETS.iconActionButton}
                                                asChild
                                                title="Ver en Google Maps"
                                                aria-label="Ver en Google Maps"
                                            >
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                        center.address,
                                                    )}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <MapPin className="h-4 w-4" aria-hidden="true" />
                                                    <span className="sr-only">Ver en Google Maps</span>
                                                </a>
                                            </Button>
                                        )}
                                        <Button variant="outline" size="icon" className={UI_PRESETS.iconActionButton} asChild>
                                            <Link href={educationCenters.show(center.id).url} aria-label="Ver Centro" title="Ver Centro">
                                                <Eye />
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="icon" className={UI_PRESETS.iconActionButton} asChild>
                                            <Link
                                                href={educationCenters.edit(center.id).url}
                                                aria-label="Editar Centro"
                                                title="Editar Centro"
                                            >
                                                <Pencil />
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className={UI_PRESETS.iconActionButtonDanger}
                                            aria-label="Eliminar Centro"
                                            title="Eliminar Centro"
                                            onClick={() => onDeleteCenter(center)}
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                No hay centros para mostrar con el filtro actual.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
