param(
  [Parameter(Mandatory = $true)][string]$ClientId,
  [string]$ActivityBase64 = "",
  [switch]$Clear
)

$ErrorActionPreference = "Stop"

function New-DiscordFrame {
  param(
    [Parameter(Mandatory = $true)][UInt32]$Opcode,
    [Parameter(Mandatory = $true)]$Payload
  )

  $json = $Payload | ConvertTo-Json -Depth 20 -Compress
  $payloadBytes = [Text.Encoding]::UTF8.GetBytes($json)
  $opcodeBytes = [BitConverter]::GetBytes($Opcode)
  $lengthBytes = [BitConverter]::GetBytes([UInt32]$payloadBytes.Length)
  return $opcodeBytes + $lengthBytes + $payloadBytes
}

function Read-DiscordFrame {
  param([Parameter(Mandatory = $true)]$Stream)

  $header = New-Object byte[] 8
  $read = $Stream.Read($header, 0, 8)
  if ($read -lt 8) {
    return $null
  }

  $length = [BitConverter]::ToUInt32($header, 4)
  if ($length -eq 0) {
    return $null
  }

  $payload = New-Object byte[] $length
  $offset = 0
  while ($offset -lt $length) {
    $chunk = $Stream.Read($payload, $offset, $length - $offset)
    if ($chunk -le 0) {
      break
    }
    $offset += $chunk
  }

  if ($offset -lt $length) {
    return $null
  }

  return [Text.Encoding]::UTF8.GetString($payload)
}

function Get-Activity {
  if ($Clear) {
    return $null
  }

  if ([string]::IsNullOrWhiteSpace($ActivityBase64)) {
    throw "ActivityBase64 is required unless -Clear is used."
  }

  $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($ActivityBase64))
  return $json | ConvertFrom-Json
}

$stream = $null
for ($i = 0; $i -lt 10; $i++) {
  try {
    $candidate = New-Object IO.Pipes.NamedPipeClientStream(".", "discord-ipc-$i", [IO.Pipes.PipeDirection]::InOut)
    $candidate.Connect(180)
    $stream = $candidate
    break
  } catch {
    if ($candidate) {
      $candidate.Dispose()
    }
  }
}

if (!$stream) {
  Write-Output "discord-not-running"
  exit 2
}

try {
  $handshake = New-DiscordFrame -Opcode 0 -Payload @{ v = 1; client_id = $ClientId }
  $stream.Write($handshake, 0, $handshake.Length)
  $stream.Flush()
  [void](Read-DiscordFrame -Stream $stream)

  $activity = Get-Activity
  $payload = @{
    cmd = "SET_ACTIVITY"
    args = @{
      pid = $PID
      activity = $activity
    }
    nonce = [guid]::NewGuid().ToString()
  }

  $frame = New-DiscordFrame -Opcode 1 -Payload $payload
  $stream.Write($frame, 0, $frame.Length)
  $stream.Flush()
  [void](Read-DiscordFrame -Stream $stream)
  Write-Output "discord-rpc-ok"
} catch {
  Write-Output "discord-rpc-error: $($_.Exception.Message)"
  exit 3
} finally {
  if ($stream) {
    $stream.Dispose()
  }
}
