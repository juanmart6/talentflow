import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type ConfirmDeleteDialogProps = {
    open: boolean;
    title?: string;
    description?: string;
    entityLabel?: string;
    entityName?: string | null;
    isLoading?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export default function ConfirmDeleteDialog({
    open,
    title = 'Confirmar eliminación',
    description = 'Esta acción eliminará el elemento seleccionado.',
    entityLabel = 'Elemento',
    entityName,
    isLoading = false,
    onCancel,
    onConfirm,
}: ConfirmDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <p className="text-sm">
                    {entityLabel}: <span className="font-medium">{entityName ?? '-'}</span>
                </p>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
