<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Parte de horas</title>
    <style>
        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            color: #0f172a;
            font-size: 12px;
        }

        h1 {
            margin: 0 0 8px;
            font-size: 18px;
        }

        .meta {
            margin-bottom: 18px;
            color: #475569;
        }

        .summary {
            margin-bottom: 16px;
            padding: 10px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #f8fafc;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            border: 1px solid #cbd5e1;
            padding: 6px;
            text-align: left;
        }

        th {
            background: #e2e8f0;
        }

        .status {
            text-transform: capitalize;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <h1>Parte de horas</h1>

    <div class="meta">
        <div><strong>Becario:</strong> {{ $intern['name'] ?? '-' }}</div>
        <div><strong>Email:</strong> {{ $intern['email'] ?? '-' }}</div>
        <div><strong>Generado:</strong> {{ $generatedAt ?? '-' }}</div>
    </div>

    <div class="summary">
        <div><strong>Periodo:</strong> {{ $range['label'] ?? '-' }} ({{ $range['start'] ?? '-' }} - {{ $range['end'] ?? '-' }})</div>
        <div><strong>Horas efectivas:</strong> {{ $range['worked_hours'] ?? 0 }} h</div>
        <div><strong>Horas planificadas:</strong> {{ $range['planned_hours'] ?? 0 }} h</div>
        <div><strong>Cumplimiento:</strong> {{ $range['compliance_percent'] ?? 0 }}%</div>
        <div><strong>Progreso total:</strong> {{ data_get($summary, 'progress.progress_percent', 0) }}%</div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Dia</th>
                <th>Horas planificadas</th>
                <th>Horas efectivas</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @foreach($days as $day)
                <tr>
                    <td>{{ $day['date'] ?? '-' }}</td>
                    <td>{{ $day['weekday'] ?? '-' }}</td>
                    <td>{{ $day['planned_hours'] ?? 0 }} h</td>
                    <td>{{ $day['worked_hours'] ?? 0 }} h</td>
                    <td class="status">{{ $day['status'] ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
