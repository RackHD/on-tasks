module.exports.amiOutput = '+---------------------------------------------------------------------------+\n' +
                           '|                *** ******** ****** *******  ********                      |\n' +
                           '|      ********* ******* ******** ********** **** *** ****** *********      |\n' +
                           '+---------------------------------------------------------------------------+\n' +
                           'Reading flash ............... done\n' +
                           '- System ROM ID = S2RS4A08\n' +
                           '- System ROM GUID = b5c59087-feac-4b41-9d80790ba5aa070f\n' +
                           '- System ROM Secure Flash = Diable.';

module.exports.lspciOutput = 'Slot:	00:00.0\n' +
                             'Class:	Host bridge [0600]\n' +
                             'Vendor:	Intel Corporation [8086]\n' +
                             'Device:	440FX - 82441FX PMC [Natoma] [1237]\n' +
                             'Rev:	02' +
                             '\n' +
                             'Slot:	00:01.0\n' +
                             'Class:	ISA bridge [0601]\n' +
                             'Vendor:	Intel Corporation [8086]\n' +
                             'Device:	82371SB PIIX3 ISA [Natoma/Triton II] [7000]\n' +
                             '\n' +
                             'Slot:	00:01.1\n' +
                             'Class:	IDE interface [0101]\n' +
                             'Vendor:	Intel Corporation [8086]\n' +
                             'Device:	82371AB/EB/MB PIIX4 IDE [7111]\n' +
                             'Rev:	01\n' +
                             'ProgIf:	8a\n' +
                             '\n' +
                             'Slot:	00:02.0\n' +
                             'Class:	VGA compatible controller [0300]\n' +
                             'Vendor:	InnoTek Systemberatung GmbH [80ee]\n' +
                             'Device:	VirtualBox Graphics Adapter [beef]\n' +
                             '\n' +
                             'Slot:	00:03.0\n' +
                             'Class:	Ethernet controller [0200]\n' +
                             'Vendor:	Intel Corporation [8086]\n' +
                             'Device:	82540EM Gigabit Ethernet Controller [100e]\n' +
                             'SVendor:	Intel Corporation [8086]\n' +
                             'SDevice:	PRO/1000 MT Desktop Adapter [001e]\n' +
                             'Rev:	02\n' +
                             '\n' +
                             'Slot:	00:04.0\n' +
                             'Class:	System peripheral [0880]\n' +
                             'Vendor:	InnoTek Systemberatung GmbH [80ee]\n' +
                             'Device:	VirtualBox Guest Service [cafe]\n' +
                             '\n' +
                             'Slot:	00:06.0\n' +
                             'Class:	USB controller [0c03]\n' +
                             'Vendor:	Apple Inc. [106b]\n' +
                             'Device:	KeyLargo/Intrepid USB [003f]\n' +
                             'ProgIf:	10\n' +
                             '\n' +
                             'Slot:	00:07.0' +
                             'Class:	Bridge [0680]\n' +
                             'Vendor:	Intel Corporation [8086]\n' +
                             'Device:	82371AB/EB/MB PIIX4 ACPI [7113]\n' +
                             'Rev:	08\n' +
                             '\n' +
                             'Slot:	00:0b.0\n' +
                             'Class:	USB controller [0c03]\n' +
                             'Vendor:	Intel Corporation [8086]\n' +
                             'Device:	82801FB/FBM/FR/FW/FRW (ICH6 Family) USB2 EHCI Controller [265c]\n' +
                             'ProgIf:	20';

module.exports.lsscsiPlusRotationalOutput =
'KNAME TYPE ROTA\n' +
'sda   disk    0\n' +
'sdb   disk    1\n' +
'sdb1  part    1\n' +
'sdb2  part    1\n' +
'sdb3  part    1\n' +
'dm-0  lvm     1\n' +
'dm-1  lvm     1\n' +
'sdc   disk    1\n' +
'sdd   disk    1\n' +
'sde   disk    1\n' +
'sdf   disk    1\n' +
'BREAK\n' +
'[0:0:0:0]    disk    HITACHI  HUSMM812 CLAR200 C118  /dev/sdb    200GB\n' +
'[0:0:1:0]    enclosu EMC      ESES Enclosure   0001  -               -\n' +
'[0:0:2:0]    disk    HGST     HUSMM8080ASS200  A116  /dev/sdc        -\n' +
'[0:0:3:0]    disk    SEAGATE  ST4000NM0023     GK88  /dev/sdd        -\n' +
'[0:0:4:0]    disk    SEAGATE  ST4000NM0023     GK88  /dev/sde        -\n' +
'[0:0:5:0]    disk    SEAGATE  ST4000NM0023     GK88  /dev/sdf        -\n' +
'[0:0:6:0]    disk    SEAGATE  ST4000NM0023     GK88  /dev/sdg        -\n' +
'[0:0:7:0]    disk    HGST     HUSMM8080ASS200  A116  /dev/sdh        -\n' +
'[0:0:8:0]    disk    HGST     HUSMM8080ASS200  A116  /dev/sdi        -\n' +
'[0:0:9:0]    disk    SEAGATE  ST4000NM0023     GK88  /dev/sdj        -\n' +
'[0:0:10:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdk        -\n' +
'[0:0:11:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdl        -\n' +
'[0:0:12:0]   disk    HITACHI  HUSMM808 CLAR800 C210  /dev/sdm        -\n' +
'[0:0:13:0]   disk    HGST     HUSMM8080ASS200  A116  /dev/sdn        -\n' +
'[0:0:14:0]   disk    HGST     HUSMM8080ASS200  A116  /dev/sdo        -\n' +
'[0:0:15:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdp        -\n' +
'[0:0:16:0]   disk    HGST     HUSMM8080ASS200  A116  /dev/sdq        -\n' +
'[0:0:17:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdr        -\n' +
'[0:0:18:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sds        -\n' +
'[0:0:19:0]   disk    HGST     HUSMM8080ASS200  A116  /dev/sdt        -\n' +
'[0:0:20:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdu        -\n' +
'[0:0:21:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdv        -\n' +
'[0:0:22:0]   disk    HGST     HUSMM8080ASS200  A116  /dev/sdw        -\n' +
'[0:0:23:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdx        -\n' +
'[0:0:24:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdy        -\n' +
'[0:0:25:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdz        -\n' +
'[0:0:26:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdaa       -\n' +
'[0:0:27:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdab       -\n' +
'[0:0:28:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdac       -\n' +
'[0:0:29:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdad       -\n' +
'[0:0:30:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdae       -\n' +
'[0:0:31:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdaf       -\n' +
'[0:0:32:0]   enclosu EMC      ESES Enclosure   0001  -               -\n' +
'[0:0:33:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdag       -\n' +
'[0:0:34:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdah       -\n' +
'[0:0:35:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdai       -\n' +
'[0:0:36:0]   disk    HGST     HUSMM8080ASS200  A116  /dev/sdaj       -\n' +
'[0:0:37:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdak       -\n' +
'[0:0:38:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdal       -\n' +
'[0:0:39:0]   disk    HITACHI  HUSMM808 CLAR800 C210  /dev/sdam       -\n' +
'[0:0:40:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdan       -\n' +
'[0:0:41:0]   disk    HITACHI  HUSMM808 CLAR800 C210  /dev/sdao       -\n' +
'[0:0:42:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdap       -\n' +
'[0:0:43:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdaq       -\n' +
'[0:0:44:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdar       -\n' +
'[0:0:45:0]   disk    HGST     HUSMM8080ASS200  A116  /dev/sdas       -\n' +
'[0:0:46:0]   disk    HGST     HUSMM8080ASS200  A116  /dev/sdat       -\n' +
'[0:0:47:0]   disk    HGST     HUSMM8080ASS200  A116  /dev/sdau       -\n' +
'[0:0:48:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdav       -\n' +
'[0:0:49:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdaw       -\n' +
'[0:0:50:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdax       -\n' +
'[0:0:51:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sday       -\n' +
'[0:0:52:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdaz       -\n' +
'[0:0:53:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdba       -\n' +
'[0:0:54:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdbb       -\n' +
'[0:0:55:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdbc       -\n' +
'[0:0:56:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdbd       -\n' +
'[0:0:57:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdbe       -\n' +
'[0:0:58:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdbf       -\n' +
'[0:0:59:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdbg       -\n' +
'[0:0:60:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdbh       -\n' +
'[0:0:61:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdbi       -\n' +
'[0:0:62:0]   disk    SEAGATE  ST4000NM0023     GK88  /dev/sdbj       -\n' +
'[0:0:63:0]   enclosu EMC      ESES Enclosure   0001  -               -\n' +
'[2:0:0:0]    disk    ATA      SATADOM-SL 3ME   S130  /dev/sda   32.0GB\n' +
'[10:0:0:0]   disk    ATA      32GB SATA Flash  SFDE  /dev/sda   32.0GB';

module.exports.lshwOutput = JSON.stringify(
                                            {
                                              "id" : "renasar-diagnostic-rootfs",
                                              "class" : "system",
                                              "claimed" : true,
                                              "handle" : "DMI:0001",
                                              "description" : "System",
                                              "product" : "S2600JF (To be filled by O.E.M.)",
                                              "vendor" : "EMC",
                                              "version" : "FFF",
                                              "serial" : "FC6VW142000003",
                                              "width" : 64,
                                              "configuration" : {
                                                "administrator_password" : "enabled",
                                                "boot" : "normal",
                                                "chassis" : "server",
                                                "family" : "To be filled by O.E.M.",
                                                "frontpanel_password" : "disabled",
                                                "power-on_password" : "disabled",
                                                "sku" : "To be filled by O.E.M.",
                                                "uuid" : "9091F221-2C4B-11E3-BCCB-001E67694CB8"
                                              },
                                              "capabilities" : {
                                                "smbios-2.6" : "SMBIOS version 2.6",
                                                "dmi-2.6" : "DMI version 2.6",
                                                "ldt16" : true,
                                                "vsyscall32" : "32-bit processes"
                                              },
                                              "children" : [
                                                {
                                                  "id" : "core",
                                                  "class" : "bus",
                                                  "claimed" : true,
                                                  "handle" : "DMI:0002",
                                                  "description" : "Motherboard",
                                                  "product" : "S2600JF",
                                                  "vendor" : "Intel Corporation",
                                                  "physid" : "0",
                                                  "version" : "G28033-509",
                                                  "serial" : "QSJP33904117",
                                                  "slot" : "To be filled by O.E.M.",
                                                  "children" : [
                                                    {
                                                      "id" : "firmware",
                                                      "class" : "memory",
                                                      "claimed" : true,
                                                      "description" : "BIOS",
                                                      "vendor" : "Intel Corp.",
                                                      "physid" : "0",
                                                      "version" : "SE5C600.86B.02.02.0002.122320131210",
                                                      "date" : "12/23/2013",
                                                      "units" : "bytes",
                                                      "size" : 65536,
                                                      "capacity" : 8323072,
                                                      "capabilities" : {
                                                        "pci" : "PCI bus",
                                                        "upgrade" : "BIOS EEPROM can be upgraded",
                                                        "shadowing" : "BIOS shadowing",
                                                        "cdboot" : "Booting from CD-ROM/DVD",
                                                        "bootselect" : "Selectable boot path",
                                                        "edd" : "Enhanced Disk Drive extensions",
                                                        "int13floppy1200" : "5.25\" 1.2MB floppy",
                                                        "int13floppy720" : "3.5\" 720KB floppy",
                                                        "int13floppy2880" : "3.5\" 2.88MB floppy",
                                                        "int5printscreen" : "Print Screen key",
                                                        "int9keyboard" : "i8042 keyboard controller",
                                                        "int14serial" : "INT14 serial line control",
                                                        "int17printer" : "INT17 printer control",
                                                        "acpi" : "ACPI",
                                                        "usb" : "USB legacy emulation",
                                                        "biosbootspecification" : "BIOS boot specification"
                                                      }
                                                    },
                                                    {
                                                      "id" : "cpu:0",
                                                      "class" : "processor",
                                                      "claimed" : true,
                                                      "handle" : "DMI:0004",
                                                      "description" : "CPU",
                                                      "product" : "Intel(R) Xeon(R) CPU E5-2630 v2 @ 2.60GHz",
                                                      "vendor" : "Intel Corp.",
                                                      "physid" : "1",
                                                      "businfo" : "cpu@0",
                                                      "version" : "Intel(R) Xeon(R) CPU E5-2630 v2 @ 2.60GHz",
                                                      "slot" : "CPU 1",
                                                      "units" : "Hz",
                                                      "size" : 1200000000,
                                                      "capacity" : 1200000000,
                                                      "width" : 64,
                                                      "clock" : 100000000,
                                                      "configuration" : {
                                                        "cores" : "6",
                                                        "enabledcores" : "6",
                                                        "threads" : "12"
                                                      },
                                                      "capabilities" : {
                                                        "x86-64" : "64bits extensions (x86-64)",
                                                        "fpu" : "mathematical co-processor",
                                                        "fpu_exception" : "FPU exceptions reporting",
                                                        "wp" : true,
                                                        "vme" : "virtual mode extensions",
                                                        "de" : "debugging extensions",
                                                        "pse" : "page size extensions",
                                                        "tsc" : "time stamp counter",
                                                        "msr" : "model-specific registers",
                                                        "pae" : "4GB+ memory addressing (Physical Address Extension)",
                                                        "mce" : "machine check exceptions",
                                                        "cx8" : "compare and exchange 8-byte",
                                                        "apic" : "on-chip advanced programmable interrupt controller (APIC)",
                                                        "sep" : "fast system calls",
                                                        "mtrr" : "memory type range registers",
                                                        "pge" : "page global enable",
                                                        "mca" : "machine check architecture",
                                                        "cmov" : "conditional move instruction",
                                                        "pat" : "page attribute table",
                                                        "pse36" : "36-bit page size extensions",
                                                        "clflush" : true,
                                                        "dts" : "debug trace and EMON store MSRs",
                                                        "acpi" : "thermal control (ACPI)",
                                                        "mmx" : "multimedia extensions (MMX)",
                                                        "fxsr" : "fast floating point save/restore",
                                                        "sse" : "streaming SIMD extensions (SSE)",
                                                        "sse2" : "streaming SIMD extensions (SSE2)",
                                                        "ss" : "self-snoop",
                                                        "ht" : "HyperThreading",
                                                        "tm" : "thermal interrupt and status",
                                                        "pbe" : "pending break event",
                                                        "syscall" : "fast system calls",
                                                        "nx" : "no-execute bit (NX)",
                                                        "pdpe1gb" : true,
                                                        "rdtscp" : true,
                                                        "constant_tsc" : true,
                                                        "arch_perfmon" : true,
                                                        "pebs" : true,
                                                        "bts" : true,
                                                        "rep_good" : true,
                                                        "nopl" : true,
                                                        "xtopology" : true,
                                                        "nonstop_tsc" : true,
                                                        "aperfmperf" : true,
                                                        "eagerfpu" : true,
                                                        "pni" : true,
                                                        "pclmulqdq" : true,
                                                        "dtes64" : true,
                                                        "monitor" : true,
                                                        "ds_cpl" : true,
                                                        "vmx" : true,
                                                        "smx" : true,
                                                        "est" : true,
                                                        "tm2" : true,
                                                        "ssse3" : true,
                                                        "cx16" : true,
                                                        "xtpr" : true,
                                                        "pdcm" : true,
                                                        "pcid" : true,
                                                        "dca" : true,
                                                        "sse4_1" : true,
                                                        "sse4_2" : true,
                                                        "x2apic" : true,
                                                        "popcnt" : true,
                                                        "tsc_deadline_timer" : true,
                                                        "aes" : true,
                                                        "xsave" : true,
                                                        "avx" : true,
                                                        "f16c" : true,
                                                        "rdrand" : true,
                                                        "lahf_lm" : true,
                                                        "ida" : true,
                                                        "arat" : true,
                                                        "epb" : true,
                                                        "xsaveopt" : true,
                                                        "pln" : true,
                                                        "pts" : true,
                                                        "dtherm" : true,
                                                        "tpr_shadow" : true,
                                                        "vnmi" : true,
                                                        "flexpriority" : true,
                                                        "ept" : true,
                                                        "vpid" : true,
                                                        "fsgsbase" : true,
                                                        "smep" : true,
                                                        "erms" : true,
                                                        "cpufreq" : "CPU Frequency scaling"
                                                      },
                                                      "children" : [
                                                        {
                                                          "id" : "cache:0",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:0005",
                                                          "description" : "L1 cache",
                                                          "physid" : "5",
                                                          "slot" : "L1-Cache",
                                                          "units" : "bytes",
                                                          "size" : 393216,
                                                          "capacity" : 393216,
                                                          "capabilities" : {
                                                            "internal" : "Internal",
                                                            "write-back" : "Write-back",
                                                            "unified" : "Unified cache"
                                                          }
                                                        },
                                                        {
                                                          "id" : "cache:1",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:0006",
                                                          "description" : "L2 cache",
                                                          "physid" : "6",
                                                          "slot" : "L2-Cache",
                                                          "units" : "bytes",
                                                          "size" : 1572864,
                                                          "capacity" : 1572864,
                                                          "capabilities" : {
                                                            "internal" : "Internal",
                                                            "varies" : "Varies With Memory Address",
                                                            "unified" : "Unified cache"
                                                          }
                                                        },
                                                        {
                                                          "id" : "cache:2",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:0007",
                                                          "description" : "L3 cache",
                                                          "physid" : "7",
                                                          "slot" : "L3-Cache",
                                                          "units" : "bytes",
                                                          "size" : 15728640,
                                                          "capacity" : 15728640,
                                                          "capabilities" : {
                                                            "internal" : "Internal",
                                                            "varies" : "Varies With Memory Address",
                                                            "unified" : "Unified cache"
                                                          }
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "id" : "cpu:1",
                                                      "class" : "processor",
                                                      "claimed" : true,
                                                      "handle" : "DMI:0008",
                                                      "description" : "CPU",
                                                      "product" : "Intel(R) Xeon(R) CPU E5-2630 v2 @ 2.60GHz",
                                                      "vendor" : "Intel Corp.",
                                                      "physid" : "2",
                                                      "businfo" : "cpu@1",
                                                      "version" : "Intel(R) Xeon(R) CPU E5-2630 v2 @ 2.60GHz",
                                                      "slot" : "CPU 2",
                                                      "units" : "Hz",
                                                      "size" : 1200000000,
                                                      "capacity" : 1200000000,
                                                      "width" : 64,
                                                      "clock" : 100000000,
                                                      "configuration" : {
                                                        "cores" : "6",
                                                        "enabledcores" : "6",
                                                        "threads" : "12"
                                                      },
                                                      "capabilities" : {
                                                        "x86-64" : "64bits extensions (x86-64)",
                                                        "fpu" : "mathematical co-processor",
                                                        "fpu_exception" : "FPU exceptions reporting",
                                                        "wp" : true,
                                                        "vme" : "virtual mode extensions",
                                                        "de" : "debugging extensions",
                                                        "pse" : "page size extensions",
                                                        "tsc" : "time stamp counter",
                                                        "msr" : "model-specific registers",
                                                        "pae" : "4GB+ memory addressing (Physical Address Extension)",
                                                        "mce" : "machine check exceptions",
                                                        "cx8" : "compare and exchange 8-byte",
                                                        "apic" : "on-chip advanced programmable interrupt controller (APIC)",
                                                        "sep" : "fast system calls",
                                                        "mtrr" : "memory type range registers",
                                                        "pge" : "page global enable",
                                                        "mca" : "machine check architecture",
                                                        "cmov" : "conditional move instruction",
                                                        "pat" : "page attribute table",
                                                        "pse36" : "36-bit page size extensions",
                                                        "clflush" : true,
                                                        "dts" : "debug trace and EMON store MSRs",
                                                        "acpi" : "thermal control (ACPI)",
                                                        "mmx" : "multimedia extensions (MMX)",
                                                        "fxsr" : "fast floating point save/restore",
                                                        "sse" : "streaming SIMD extensions (SSE)",
                                                        "sse2" : "streaming SIMD extensions (SSE2)",
                                                        "ss" : "self-snoop",
                                                        "ht" : "HyperThreading",
                                                        "tm" : "thermal interrupt and status",
                                                        "pbe" : "pending break event",
                                                        "syscall" : "fast system calls",
                                                        "nx" : "no-execute bit (NX)",
                                                        "pdpe1gb" : true,
                                                        "rdtscp" : true,
                                                        "constant_tsc" : true,
                                                        "arch_perfmon" : true,
                                                        "pebs" : true,
                                                        "bts" : true,
                                                        "rep_good" : true,
                                                        "nopl" : true,
                                                        "xtopology" : true,
                                                        "nonstop_tsc" : true,
                                                        "aperfmperf" : true,
                                                        "eagerfpu" : true,
                                                        "pni" : true,
                                                        "pclmulqdq" : true,
                                                        "dtes64" : true,
                                                        "monitor" : true,
                                                        "ds_cpl" : true,
                                                        "vmx" : true,
                                                        "smx" : true,
                                                        "est" : true,
                                                        "tm2" : true,
                                                        "ssse3" : true,
                                                        "cx16" : true,
                                                        "xtpr" : true,
                                                        "pdcm" : true,
                                                        "pcid" : true,
                                                        "dca" : true,
                                                        "sse4_1" : true,
                                                        "sse4_2" : true,
                                                        "x2apic" : true,
                                                        "popcnt" : true,
                                                        "tsc_deadline_timer" : true,
                                                        "aes" : true,
                                                        "xsave" : true,
                                                        "avx" : true,
                                                        "f16c" : true,
                                                        "rdrand" : true,
                                                        "lahf_lm" : true,
                                                        "ida" : true,
                                                        "arat" : true,
                                                        "epb" : true,
                                                        "xsaveopt" : true,
                                                        "pln" : true,
                                                        "pts" : true,
                                                        "dtherm" : true,
                                                        "tpr_shadow" : true,
                                                        "vnmi" : true,
                                                        "flexpriority" : true,
                                                        "ept" : true,
                                                        "vpid" : true,
                                                        "fsgsbase" : true,
                                                        "smep" : true,
                                                        "erms" : true,
                                                        "cpufreq" : "CPU Frequency scaling"
                                                      },
                                                      "children" : [
                                                        {
                                                          "id" : "cache:0",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:0009",
                                                          "description" : "L1 cache",
                                                          "physid" : "9",
                                                          "slot" : "L1-Cache",
                                                          "units" : "bytes",
                                                          "size" : 393216,
                                                          "capacity" : 393216,
                                                          "capabilities" : {
                                                            "internal" : "Internal",
                                                            "write-back" : "Write-back",
                                                            "unified" : "Unified cache"
                                                          }
                                                        },
                                                        {
                                                          "id" : "cache:1",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:000A",
                                                          "description" : "L2 cache",
                                                          "physid" : "a",
                                                          "slot" : "L2-Cache",
                                                          "units" : "bytes",
                                                          "size" : 1572864,
                                                          "capacity" : 1572864,
                                                          "capabilities" : {
                                                            "internal" : "Internal",
                                                            "varies" : "Varies With Memory Address",
                                                            "unified" : "Unified cache"
                                                          }
                                                        },
                                                        {
                                                          "id" : "cache:2",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:000B",
                                                          "description" : "L3 cache",
                                                          "physid" : "b",
                                                          "slot" : "L3-Cache",
                                                          "units" : "bytes",
                                                          "size" : 15728640,
                                                          "capacity" : 15728640,
                                                          "capabilities" : {
                                                            "internal" : "Internal",
                                                            "varies" : "Varies With Memory Address",
                                                            "unified" : "Unified cache"
                                                          }
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "id" : "memory:0",
                                                      "class" : "memory",
                                                      "claimed" : true,
                                                      "handle" : "DMI:003E",
                                                      "description" : "System Memory",
                                                      "physid" : "3e",
                                                      "slot" : "System board or motherboard",
                                                      "children" : [
                                                        {
                                                          "id" : "bank:0",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:0040",
                                                          "description" : "DIMM DDR3 Synchronous 1600 MHz (0.6 ns)",
                                                          "product" : "36JSF2G72PZ-1G6E1",
                                                          "vendor" : "Micron",
                                                          "physid" : "0",
                                                          "serial" : "E38F4EB0",
                                                          "slot" : "DIMM_A1",
                                                          "units" : "bytes",
                                                          "size" : 17179869184,
                                                          "width" : 64,
                                                          "clock" : 1600000000
                                                        },
                                                        {
                                                          "id" : "bank:1",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:0046",
                                                          "description" : "DIMM DDR3 Synchronous 1600 MHz (0.6 ns)",
                                                          "product" : "36JSF2G72PZ-1G6E1",
                                                          "vendor" : "Micron",
                                                          "physid" : "1",
                                                          "serial" : "E38F4EC0",
                                                          "slot" : "DIMM_B1",
                                                          "units" : "bytes",
                                                          "size" : 17179869184,
                                                          "width" : 64,
                                                          "clock" : 1600000000
                                                        },
                                                        {
                                                          "id" : "bank:2",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:004C",
                                                          "description" : "DIMM DDR3 Synchronous 1600 MHz (0.6 ns)",
                                                          "product" : "36JSF2G72PZ-1G6E1",
                                                          "vendor" : "Micron",
                                                          "physid" : "2",
                                                          "serial" : "E38F4E93",
                                                          "slot" : "DIMM_C1",
                                                          "units" : "bytes",
                                                          "size" : 17179869184,
                                                          "width" : 64,
                                                          "clock" : 1600000000
                                                        },
                                                        {
                                                          "id" : "bank:3",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:0052",
                                                          "description" : "DIMM DDR3 Synchronous 1600 MHz (0.6 ns)",
                                                          "product" : "36JSF2G72PZ-1G6E1",
                                                          "vendor" : "Micron",
                                                          "physid" : "3",
                                                          "serial" : "E38F4EA5",
                                                          "slot" : "DIMM_D1",
                                                          "units" : "bytes",
                                                          "size" : 17179869184,
                                                          "width" : 64,
                                                          "clock" : 1600000000
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "id" : "memory:1",
                                                      "class" : "memory",
                                                      "claimed" : true,
                                                      "handle" : "DMI:0058",
                                                      "description" : "System Memory",
                                                      "physid" : "58",
                                                      "slot" : "System board or motherboard",
                                                      "children" : [
                                                        {
                                                          "id" : "bank:0",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:005A",
                                                          "description" : "DIMM DDR3 Synchronous 1600 MHz (0.6 ns)",
                                                          "product" : "36JSF2G72PZ-1G6E1",
                                                          "vendor" : "Micron",
                                                          "physid" : "0",
                                                          "serial" : "E38F4EB1",
                                                          "slot" : "DIMM_E1",
                                                          "units" : "bytes",
                                                          "size" : 17179869184,
                                                          "width" : 64,
                                                          "clock" : 1600000000
                                                        },
                                                        {
                                                          "id" : "bank:1",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:0060",
                                                          "description" : "DIMM DDR3 Synchronous 1600 MHz (0.6 ns)",
                                                          "product" : "36JSF2G72PZ-1G6E1",
                                                          "vendor" : "Micron",
                                                          "physid" : "1",
                                                          "serial" : "E38F4EA4",
                                                          "slot" : "DIMM_F1",
                                                          "units" : "bytes",
                                                          "size" : 17179869184,
                                                          "width" : 64,
                                                          "clock" : 1600000000
                                                        },
                                                        {
                                                          "id" : "bank:2",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:0066",
                                                          "description" : "DIMM DDR3 Synchronous 1600 MHz (0.6 ns)",
                                                          "product" : "36JSF2G72PZ-1G6E1",
                                                          "vendor" : "Micron",
                                                          "physid" : "2",
                                                          "serial" : "E38F4EBD",
                                                          "slot" : "DIMM_G1",
                                                          "units" : "bytes",
                                                          "size" : 17179869184,
                                                          "width" : 64,
                                                          "clock" : 1600000000
                                                        },
                                                        {
                                                          "id" : "bank:3",
                                                          "class" : "memory",
                                                          "claimed" : true,
                                                          "handle" : "DMI:006C",
                                                          "description" : "DIMM DDR3 Synchronous 1600 MHz (0.6 ns)",
                                                          "product" : "36JSF2G72PZ-1G6E1",
                                                          "vendor" : "Micron",
                                                          "physid" : "3",
                                                          "serial" : "E38F4EA1",
                                                          "slot" : "DIMM_H1",
                                                          "units" : "bytes",
                                                          "size" : 17179869184,
                                                          "width" : 64,
                                                          "clock" : 1600000000
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "id" : "memory:2",
                                                      "class" : "memory",
                                                      "physid" : "4"
                                                    },
                                                    {
                                                      "id" : "memory:3",
                                                      "class" : "memory",
                                                      "physid" : "6"
                                                    },
                                                    {
                                                      "id" : "pci:0",
                                                      "class" : "bridge",
                                                      "claimed" : true,
                                                      "handle" : "PCIBUS:0000:00",
                                                      "description" : "Host bridge",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 DMI2",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "100",
                                                      "businfo" : "pci@0000:00:00.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "children" : [
                                                        {
                                                          "id" : "pci:0",
                                                          "class" : "bridge",
                                                          "claimed" : true,
                                                          "handle" : "PCIBUS:0000:01",
                                                          "description" : "PCI bridge",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 PCI Express Root Port 1a",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "1",
                                                          "businfo" : "pci@0000:00:01.0",
                                                          "version" : "04",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "pcieport"
                                                          },
                                                          "capabilities" : {
                                                            "pci" : true,
                                                            "msi" : "Message Signalled Interrupts",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "normal_decode" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "pci:1",
                                                          "class" : "bridge",
                                                          "claimed" : true,
                                                          "handle" : "PCIBUS:0000:02",
                                                          "description" : "PCI bridge",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 PCI Express Root Port 2a",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "2",
                                                          "businfo" : "pci@0000:00:02.0",
                                                          "version" : "04",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "pcieport"
                                                          },
                                                          "capabilities" : {
                                                            "pci" : true,
                                                            "msi" : "Message Signalled Interrupts",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "normal_decode" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          },
                                                          "children" : [
                                                            {
                                                              "id" : "storage",
                                                              "class" : "storage",
                                                              "claimed" : true,
                                                              "handle" : "PCI:0000:02:00.0",
                                                              "description" : "Serial Attached SCSI controller",
                                                              "product" : "SAS2308 PCI-Express Fusion-MPT SAS-2",
                                                              "vendor" : "LSI Logic / Symbios Logic",
                                                              "physid" : "0",
                                                              "businfo" : "pci@0000:02:00.0",
                                                              "logicalname" : "scsi0",
                                                              "version" : "05",
                                                              "width" : 64,
                                                              "clock" : 33000000,
                                                              "configuration" : {
                                                                "driver" : "mpt2sas",
                                                                "latency" : "0"
                                                              },
                                                              "capabilities" : {
                                                                "storage" : true,
                                                                "pm" : "Power Management",
                                                                "pciexpress" : "PCI Express",
                                                                "vpd" : "Vital Product Data",
                                                                "msi" : "Message Signalled Interrupts",
                                                                "msix" : "MSI-X",
                                                                "bus_master" : "bus mastering",
                                                                "cap_list" : "PCI capabilities listing",
                                                                "rom" : "extension ROM"
                                                              },
                                                              "children" : [
                                                                {
                                                                  "id" : "disk:0",
                                                                  "class" : "disk",
                                                                  "claimed" : true,
                                                                  "handle" : "SCSI:00:00:00:00",
                                                                  "description" : "SCSI Disk",
                                                                  "physid" : "0.0.0",
                                                                  "businfo" : "scsi@0:0.0.0",
                                                                  "logicalname" : "/dev/sdb",
                                                                  "dev" : "8:16",
                                                                  "units" : "bytes",
                                                                  "size" : 800176914432,
                                                                  "configuration" : {
                                                                    "sectorsize" : "4096"
                                                                  }
                                                                },
                                                                {
                                                                  "id" : "disk:1",
                                                                  "class" : "disk",
                                                                  "claimed" : true,
                                                                  "handle" : "SCSI:00:00:01:00",
                                                                  "description" : "SCSI Disk",
                                                                  "physid" : "0.1.0",
                                                                  "businfo" : "scsi@0:0.1.0",
                                                                  "logicalname" : "/dev/sdc",
                                                                  "dev" : "8:32",
                                                                  "units" : "bytes",
                                                                  "size" : 4000787030016,
                                                                  "configuration" : {
                                                                    "sectorsize" : "512"
                                                                  }
                                                                },
                                                                {
                                                                  "id" : "disk:2",
                                                                  "class" : "disk",
                                                                  "claimed" : true,
                                                                  "handle" : "SCSI:00:00:02:00",
                                                                  "description" : "SCSI Disk",
                                                                  "physid" : "0.2.0",
                                                                  "businfo" : "scsi@0:0.2.0",
                                                                  "logicalname" : "/dev/sdd",
                                                                  "dev" : "8:48",
                                                                  "units" : "bytes",
                                                                  "size" : 4000787030016,
                                                                  "configuration" : {
                                                                    "sectorsize" : "512"
                                                                  }
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "id" : "pci:2",
                                                          "class" : "bridge",
                                                          "claimed" : true,
                                                          "handle" : "PCIBUS:0000:03",
                                                          "description" : "PCI bridge",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 PCI Express Root Port 3a",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "3",
                                                          "businfo" : "pci@0000:00:03.0",
                                                          "version" : "04",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "pcieport"
                                                          },
                                                          "capabilities" : {
                                                            "pci" : true,
                                                            "msi" : "Message Signalled Interrupts",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "normal_decode" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "pci:3",
                                                          "class" : "bridge",
                                                          "claimed" : true,
                                                          "handle" : "PCIBUS:0000:04",
                                                          "description" : "PCI bridge",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 PCI Express Root Port 3c",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "3.2",
                                                          "businfo" : "pci@0000:00:03.2",
                                                          "version" : "04",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "pcieport"
                                                          },
                                                          "capabilities" : {
                                                            "pci" : true,
                                                            "msi" : "Message Signalled Interrupts",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "normal_decode" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          },
                                                          "children" : [
                                                            {
                                                              "id" : "network:0",
                                                              "class" : "network",
                                                              "disabled" : true,
                                                              "claimed" : true,
                                                              "handle" : "PCI:0000:04:00.0",
                                                              "description" : "Ethernet interface",
                                                              "product" : "82599ES 10-Gigabit SFI/SFP+ Network Connection",
                                                              "vendor" : "Intel Corporation",
                                                              "physid" : "0",
                                                              "businfo" : "pci@0000:04:00.0",
                                                              "logicalname" : "p514p1",
                                                              "version" : "01",
                                                              "serial" : "00:1e:67:ab:5e:dc",
                                                              "width" : 64,
                                                              "clock" : 33000000,
                                                              "configuration" : {
                                                                "autonegotiation" : "off",
                                                                "broadcast" : "yes",
                                                                "driver" : "ixgbe",
                                                                "driverversion" : "3.15.1-k",
                                                                "firmware" : "0x8000047d",
                                                                "latency" : "0",
                                                                "link" : "no",
                                                                "multicast" : "yes"
                                                              },
                                                              "capabilities" : {
                                                                "pm" : "Power Management",
                                                                "msi" : "Message Signalled Interrupts",
                                                                "msix" : "MSI-X",
                                                                "pciexpress" : "PCI Express",
                                                                "vpd" : "Vital Product Data",
                                                                "bus_master" : "bus mastering",
                                                                "cap_list" : "PCI capabilities listing",
                                                                "ethernet" : true,
                                                                "physical" : "Physical interface",
                                                                "fibre" : "optical fibre"
                                                              }
                                                            },
                                                            {
                                                              "id" : "network:1",
                                                              "class" : "network",
                                                              "disabled" : true,
                                                              "claimed" : true,
                                                              "handle" : "PCI:0000:04:00.1",
                                                              "description" : "Ethernet interface",
                                                              "product" : "82599ES 10-Gigabit SFI/SFP+ Network Connection",
                                                              "vendor" : "Intel Corporation",
                                                              "physid" : "0.1",
                                                              "businfo" : "pci@0000:04:00.1",
                                                              "logicalname" : "p514p2",
                                                              "version" : "01",
                                                              "serial" : "00:1e:67:ab:5e:dd",
                                                              "width" : 64,
                                                              "clock" : 33000000,
                                                              "configuration" : {
                                                                "autonegotiation" : "off",
                                                                "broadcast" : "yes",
                                                                "driver" : "ixgbe",
                                                                "driverversion" : "3.15.1-k",
                                                                "firmware" : "0x8000047d",
                                                                "latency" : "0",
                                                                "link" : "no",
                                                                "multicast" : "yes"
                                                              },
                                                              "capabilities" : {
                                                                "pm" : "Power Management",
                                                                "msi" : "Message Signalled Interrupts",
                                                                "msix" : "MSI-X",
                                                                "pciexpress" : "PCI Express",
                                                                "vpd" : "Vital Product Data",
                                                                "bus_master" : "bus mastering",
                                                                "cap_list" : "PCI capabilities listing",
                                                                "ethernet" : true,
                                                                "physical" : "Physical interface",
                                                                "fibre" : "optical fibre"
                                                              }
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "id" : "generic:0",
                                                          "class" : "generic",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:04.0",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 0",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "4",
                                                          "businfo" : "pci@0000:00:04.0",
                                                          "version" : "04",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "ioatdma",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "msix" : "MSI-X",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:1",
                                                          "class" : "generic",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:04.1",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 1",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "4.1",
                                                          "businfo" : "pci@0000:00:04.1",
                                                          "version" : "04",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "ioatdma",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "msix" : "MSI-X",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:2",
                                                          "class" : "generic",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:04.2",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 2",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "4.2",
                                                          "businfo" : "pci@0000:00:04.2",
                                                          "version" : "04",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "ioatdma",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "msix" : "MSI-X",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:3",
                                                          "class" : "generic",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:04.3",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 3",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "4.3",
                                                          "businfo" : "pci@0000:00:04.3",
                                                          "version" : "04",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "ioatdma",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "msix" : "MSI-X",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:4",
                                                          "class" : "generic",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:04.4",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 4",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "4.4",
                                                          "businfo" : "pci@0000:00:04.4",
                                                          "version" : "04",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "ioatdma",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "msix" : "MSI-X",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:5",
                                                          "class" : "generic",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:04.5",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 5",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "4.5",
                                                          "businfo" : "pci@0000:00:04.5",
                                                          "version" : "04",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "ioatdma",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "msix" : "MSI-X",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:6",
                                                          "class" : "generic",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:04.6",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 6",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "4.6",
                                                          "businfo" : "pci@0000:00:04.6",
                                                          "version" : "04",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "ioatdma",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "msix" : "MSI-X",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:7",
                                                          "class" : "generic",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:04.7",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 7",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "4.7",
                                                          "businfo" : "pci@0000:00:04.7",
                                                          "version" : "04",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "ioatdma",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "msix" : "MSI-X",
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:8",
                                                          "class" : "generic",
                                                          "handle" : "PCI:0000:00:05.0",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 VTd/Memory Map/Misc",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "5",
                                                          "businfo" : "pci@0000:00:05.0",
                                                          "version" : "04",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "pciexpress" : "PCI Express",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:9",
                                                          "class" : "generic",
                                                          "handle" : "PCI:0000:00:05.1",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Memory Hotplug",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "5.1",
                                                          "businfo" : "pci@0000:00:05.1",
                                                          "version" : "04",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "pciexpress" : "PCI Express",
                                                            "msi" : "Message Signalled Interrupts",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:10",
                                                          "class" : "generic",
                                                          "handle" : "PCI:0000:00:05.2",
                                                          "description" : "System peripheral",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 IIO RAS",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "5.2",
                                                          "businfo" : "pci@0000:00:05.2",
                                                          "version" : "04",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "pciexpress" : "PCI Express",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "generic:11",
                                                          "class" : "generic",
                                                          "handle" : "PCI:0000:00:05.4",
                                                          "description" : "PIC",
                                                          "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 IOAPIC",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "5.4",
                                                          "businfo" : "pci@0000:00:05.4",
                                                          "version" : "04",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "io_x_-apic" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "pci:4",
                                                          "class" : "bridge",
                                                          "claimed" : true,
                                                          "handle" : "PCIBUS:0000:06",
                                                          "description" : "PCI bridge",
                                                          "product" : "C600/X79 series chipset PCI Express Virtual Root Port",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "11",
                                                          "businfo" : "pci@0000:00:11.0",
                                                          "version" : "06",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "pcieport"
                                                          },
                                                          "capabilities" : {
                                                            "pci" : true,
                                                            "pciexpress" : "PCI Express",
                                                            "pm" : "Power Management",
                                                            "msi" : "Message Signalled Interrupts",
                                                            "normal_decode" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          },
                                                          "children" : [
                                                            {
                                                              "id" : "storage",
                                                              "class" : "storage",
                                                              "handle" : "PCI:0000:06:00.0",
                                                              "description" : "Serial Attached SCSI controller",
                                                              "product" : "C600/X79 series chipset 4-Port SATA Storage Control Unit",
                                                              "vendor" : "Intel Corporation",
                                                              "physid" : "0",
                                                              "businfo" : "pci@0000:06:00.0",
                                                              "version" : "06",
                                                              "width" : 64,
                                                              "clock" : 33000000,
                                                              "configuration" : {
                                                                "latency" : "0"
                                                              },
                                                              "capabilities" : {
                                                                "storage" : true,
                                                                "pm" : "Power Management",
                                                                "pciexpress" : "PCI Express",
                                                                "msix" : "MSI-X",
                                                                "bus_master" : "bus mastering",
                                                                "cap_list" : "PCI capabilities listing"
                                                              }
                                                            },
                                                            {
                                                              "id" : "serial",
                                                              "class" : "bus",
                                                              "handle" : "PCI:0000:06:00.3",
                                                              "description" : "SMBus",
                                                              "product" : "C600/X79 series chipset SMBus Controller 0",
                                                              "vendor" : "Intel Corporation",
                                                              "physid" : "0.3",
                                                              "businfo" : "pci@0000:06:00.3",
                                                              "version" : "06",
                                                              "width" : 32,
                                                              "clock" : 33000000,
                                                              "configuration" : {
                                                                "latency" : "0"
                                                              },
                                                              "capabilities" : {
                                                                "pciexpress" : "PCI Express",
                                                                "pm" : "Power Management",
                                                                "msi" : "Message Signalled Interrupts",
                                                                "bus_master" : "bus mastering",
                                                                "cap_list" : "PCI capabilities listing"
                                                              }
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "id" : "communication:0",
                                                          "class" : "communication",
                                                          "handle" : "PCI:0000:00:16.0",
                                                          "description" : "Communication controller",
                                                          "product" : "C600/X79 series chipset MEI Controller #1",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "16",
                                                          "businfo" : "pci@0000:00:16.0",
                                                          "version" : "05",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "pm" : "Power Management",
                                                            "msi" : "Message Signalled Interrupts",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "communication:1",
                                                          "class" : "communication",
                                                          "handle" : "PCI:0000:00:16.1",
                                                          "description" : "Communication controller",
                                                          "product" : "C600/X79 series chipset MEI Controller #2",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "16.1",
                                                          "businfo" : "pci@0000:00:16.1",
                                                          "version" : "05",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "pm" : "Power Management",
                                                            "msi" : "Message Signalled Interrupts",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "usb:0",
                                                          "class" : "bus",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:1a.0",
                                                          "description" : "USB controller",
                                                          "product" : "C600/X79 series chipset USB2 Enhanced Host Controller #2",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "1a",
                                                          "businfo" : "pci@0000:00:1a.0",
                                                          "version" : "06",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "ehci-pci",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "pm" : "Power Management",
                                                            "debug" : "Debug port",
                                                            "ehci" : "Enhanced Host Controller Interface (USB2)",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "pci:5",
                                                          "class" : "bridge",
                                                          "claimed" : true,
                                                          "handle" : "PCIBUS:0000:07",
                                                          "description" : "PCI bridge",
                                                          "product" : "C600/X79 series chipset PCI Express Root Port 1",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "1c",
                                                          "businfo" : "pci@0000:00:1c.0",
                                                          "version" : "b6",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "pcieport"
                                                          },
                                                          "capabilities" : {
                                                            "pci" : true,
                                                            "pciexpress" : "PCI Express",
                                                            "msi" : "Message Signalled Interrupts",
                                                            "pm" : "Power Management",
                                                            "normal_decode" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          },
                                                          "children" : [
                                                            {
                                                              "id" : "network",
                                                              "class" : "network",
                                                              "claimed" : true,
                                                              "handle" : "PCI:0000:07:00.0",
                                                              "description" : "Ethernet interface",
                                                              "product" : "I350 Gigabit Network Connection",
                                                              "vendor" : "Intel Corporation",
                                                              "physid" : "0",
                                                              "businfo" : "pci@0000:07:00.0",
                                                              "logicalname" : "em1",
                                                              "version" : "01",
                                                              "serial" : "00:1e:67:69:4c:b8",
                                                              "units" : "bit/s",
                                                              "size" : 1000000000,
                                                              "capacity" : 1000000000,
                                                              "width" : 32,
                                                              "clock" : 33000000,
                                                              "configuration" : {
                                                                "autonegotiation" : "on",
                                                                "broadcast" : "yes",
                                                                "driver" : "igb",
                                                                "driverversion" : "5.0.5-k",
                                                                "duplex" : "full",
                                                                "firmware" : "1.48, 0x8000070f",
                                                                "ip" : "10.246.71.12",
                                                                "latency" : "0",
                                                                "link" : "yes",
                                                                "multicast" : "yes",
                                                                "port" : "twisted pair",
                                                                "speed" : "1Gbit/s"
                                                              },
                                                              "capabilities" : {
                                                                "pm" : "Power Management",
                                                                "msi" : "Message Signalled Interrupts",
                                                                "msix" : "MSI-X",
                                                                "pciexpress" : "PCI Express",
                                                                "vpd" : "Vital Product Data",
                                                                "bus_master" : "bus mastering",
                                                                "cap_list" : "PCI capabilities listing",
                                                                "ethernet" : true,
                                                                "physical" : "Physical interface",
                                                                "tp" : "twisted pair",
                                                                "10bt" : "10Mbit/s",
                                                                "10bt-fd" : "10Mbit/s (full duplex)",
                                                                "100bt" : "100Mbit/s",
                                                                "100bt-fd" : "100Mbit/s (full duplex)",
                                                                "1000bt-fd" : "1Gbit/s (full duplex)",
                                                                "autonegotiation" : "Auto-negotiation"
                                                              }
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "id" : "pci:6",
                                                          "class" : "bridge",
                                                          "claimed" : true,
                                                          "handle" : "PCIBUS:0000:09",
                                                          "description" : "PCI bridge",
                                                          "product" : "C600/X79 series chipset PCI Express Root Port 8",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "1c.7",
                                                          "businfo" : "pci@0000:00:1c.7",
                                                          "version" : "b6",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "pcieport"
                                                          },
                                                          "capabilities" : {
                                                            "pci" : true,
                                                            "pciexpress" : "PCI Express",
                                                            "msi" : "Message Signalled Interrupts",
                                                            "pm" : "Power Management",
                                                            "normal_decode" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          },
                                                          "children" : [
                                                            {
                                                              "id" : "display",
                                                              "class" : "display",
                                                              "handle" : "PCI:0000:09:00.0",
                                                              "description" : "VGA compatible controller",
                                                              "product" : "MGA G200e [Pilot] ServerEngines (SEP1)",
                                                              "vendor" : "Matrox Electronics Systems Ltd.",
                                                              "physid" : "0",
                                                              "businfo" : "pci@0000:09:00.0",
                                                              "version" : "05",
                                                              "width" : 32,
                                                              "clock" : 33000000,
                                                              "configuration" : {
                                                                "latency" : "0"
                                                              },
                                                              "capabilities" : {
                                                                "pm" : "Power Management",
                                                                "pciexpress" : "PCI Express",
                                                                "msi" : "Message Signalled Interrupts",
                                                                "vga_controller" : true,
                                                                "bus_master" : "bus mastering",
                                                                "cap_list" : "PCI capabilities listing"
                                                              }
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "id" : "usb:1",
                                                          "class" : "bus",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:1d.0",
                                                          "description" : "USB controller",
                                                          "product" : "C600/X79 series chipset USB2 Enhanced Host Controller #1",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "1d",
                                                          "businfo" : "pci@0000:00:1d.0",
                                                          "version" : "06",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "ehci-pci",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "pm" : "Power Management",
                                                            "debug" : "Debug port",
                                                            "ehci" : "Enhanced Host Controller Interface (USB2)",
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "pci:7",
                                                          "class" : "bridge",
                                                          "claimed" : true,
                                                          "handle" : "PCIBUS:0000:0a",
                                                          "description" : "PCI bridge",
                                                          "product" : "82801 PCI Bridge",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "1e",
                                                          "businfo" : "pci@0000:00:1e.0",
                                                          "version" : "a6",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "capabilities" : {
                                                            "pci" : true,
                                                            "subtractive_decode" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "isa",
                                                          "class" : "bridge",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:1f.0",
                                                          "description" : "ISA bridge",
                                                          "product" : "C600/X79 series chipset LPC Controller",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "1f",
                                                          "businfo" : "pci@0000:00:1f.0",
                                                          "version" : "06",
                                                          "width" : 32,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "driver" : "lpc_ich",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "isa" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "storage",
                                                          "class" : "storage",
                                                          "claimed" : true,
                                                          "handle" : "PCI:0000:00:1f.2",
                                                          "description" : "SATA controller",
                                                          "product" : "C600/X79 series chipset 6-Port SATA AHCI Controller",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "1f.2",
                                                          "businfo" : "pci@0000:00:1f.2",
                                                          "version" : "06",
                                                          "width" : 32,
                                                          "clock" : 66000000,
                                                          "configuration" : {
                                                            "driver" : "ahci",
                                                            "latency" : "0"
                                                          },
                                                          "capabilities" : {
                                                            "storage" : true,
                                                            "msi" : "Message Signalled Interrupts",
                                                            "pm" : "Power Management",
                                                            "ahci_1.0" : true,
                                                            "bus_master" : "bus mastering",
                                                            "cap_list" : "PCI capabilities listing"
                                                          }
                                                        },
                                                        {
                                                          "id" : "serial",
                                                          "class" : "bus",
                                                          "handle" : "PCI:0000:00:1f.3",
                                                          "description" : "SMBus",
                                                          "product" : "C600/X79 series chipset SMBus Host Controller",
                                                          "vendor" : "Intel Corporation",
                                                          "physid" : "1f.3",
                                                          "businfo" : "pci@0000:00:1f.3",
                                                          "version" : "06",
                                                          "width" : 64,
                                                          "clock" : 33000000,
                                                          "configuration" : {
                                                            "latency" : "0"
                                                          }
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "id" : "generic:0",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:08.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 QPI Link 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "7",
                                                      "businfo" : "pci@0000:7f:08.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:1",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:09.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 QPI Link 1",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "9",
                                                      "businfo" : "pci@0000:7f:09.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:2",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0a.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Power Control Unit 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "a",
                                                      "businfo" : "pci@0000:7f:0a.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:3",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0a.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Power Control Unit 1",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "b",
                                                      "businfo" : "pci@0000:7f:0a.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:4",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0a.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Power Control Unit 2",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "c",
                                                      "businfo" : "pci@0000:7f:0a.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:5",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0a.3",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Power Control Unit 3",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "d",
                                                      "businfo" : "pci@0000:7f:0a.3",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:6",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0b.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 UBOX Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "e",
                                                      "businfo" : "pci@0000:7f:0b.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:7",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0b.3",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 UBOX Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "f",
                                                      "businfo" : "pci@0000:7f:0b.3",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:8",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0c.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "10",
                                                      "businfo" : "pci@0000:7f:0c.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:9",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0c.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "11",
                                                      "businfo" : "pci@0000:7f:0c.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:10",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0c.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "12",
                                                      "businfo" : "pci@0000:7f:0c.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:11",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0d.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "13",
                                                      "businfo" : "pci@0000:7f:0d.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:12",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0d.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "14",
                                                      "businfo" : "pci@0000:7f:0d.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:13",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0d.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "15",
                                                      "businfo" : "pci@0000:7f:0d.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:14",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0e.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Home Agent 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "16",
                                                      "businfo" : "pci@0000:7f:0e.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:15",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:7f:0e.1",
                                                      "description" : "Performance counters",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Home Agent 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "17",
                                                      "businfo" : "pci@0000:7f:0e.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:16",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:7f:0f.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 Target Address/Thermal Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "18",
                                                      "businfo" : "pci@0000:7f:0f.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "sbridge_edac",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:17",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0f.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 RAS Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "19",
                                                      "businfo" : "pci@0000:7f:0f.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:18",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0f.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 Channel Target Address Decoder Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "1a",
                                                      "businfo" : "pci@0000:7f:0f.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:19",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0f.3",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 Channel Target Address Decoder Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "1b",
                                                      "businfo" : "pci@0000:7f:0f.3",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:20",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0f.4",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 Channel Target Address Decoder Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "1c",
                                                      "businfo" : "pci@0000:7f:0f.4",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:21",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:0f.5",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 Channel Target Address Decoder Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "1d",
                                                      "businfo" : "pci@0000:7f:0f.5",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:22",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:7f:10.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 Thermal Control 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "1e",
                                                      "businfo" : "pci@0000:7f:10.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:23",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:7f:10.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 Thermal Control 1",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "1f",
                                                      "businfo" : "pci@0000:7f:10.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:24",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:10.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 ERROR Registers 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "20",
                                                      "businfo" : "pci@0000:7f:10.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:25",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:10.3",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 ERROR Registers 1",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "21",
                                                      "businfo" : "pci@0000:7f:10.3",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:26",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:7f:10.4",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 Thermal Control 2",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "22",
                                                      "businfo" : "pci@0000:7f:10.4",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:27",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:7f:10.5",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 Thermal Control 3",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "23",
                                                      "businfo" : "pci@0000:7f:10.5",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:28",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:10.6",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 ERROR Registers 2",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "24",
                                                      "businfo" : "pci@0000:7f:10.6",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:29",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:10.7",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 ERROR Registers 3",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "25",
                                                      "businfo" : "pci@0000:7f:10.7",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:30",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:13.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 R2PCIe",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "26",
                                                      "businfo" : "pci@0000:7f:13.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:31",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:7f:13.1",
                                                      "description" : "Performance counters",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 R2PCIe",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "27",
                                                      "businfo" : "pci@0000:7f:13.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:32",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:13.4",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 QPI Ring Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "28",
                                                      "businfo" : "pci@0000:7f:13.4",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:33",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:7f:13.5",
                                                      "description" : "Performance counters",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 QPI Ring Performance Ring Monitoring",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "29",
                                                      "businfo" : "pci@0000:7f:13.5",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:34",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:7f:13.6",
                                                      "description" : "Performance counters",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 QPI Ring Performance Ring Monitoring",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "2a",
                                                      "businfo" : "pci@0000:7f:13.6",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:35",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:16.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 System Address Decoder",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "2b",
                                                      "businfo" : "pci@0000:7f:16.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:36",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:16.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Broadcast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "2c",
                                                      "businfo" : "pci@0000:7f:16.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:37",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:7f:16.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Broadcast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "2d",
                                                      "businfo" : "pci@0000:7f:16.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "pci:1",
                                                      "class" : "bridge",
                                                      "claimed" : true,
                                                      "handle" : "PCIBUS:0000:81",
                                                      "description" : "PCI bridge",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 PCI Express Root Port 3a",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "3",
                                                      "businfo" : "pci@0000:80:03.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "pcieport"
                                                      },
                                                      "capabilities" : {
                                                        "pci" : true,
                                                        "msi" : "Message Signalled Interrupts",
                                                        "pciexpress" : "PCI Express",
                                                        "pm" : "Power Management",
                                                        "normal_decode" : true,
                                                        "bus_master" : "bus mastering",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:38",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:80:04.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "2e",
                                                      "businfo" : "pci@0000:80:04.0",
                                                      "version" : "04",
                                                      "width" : 64,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ioatdma",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "msix" : "MSI-X",
                                                        "pciexpress" : "PCI Express",
                                                        "pm" : "Power Management",
                                                        "bus_master" : "bus mastering",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:39",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:80:04.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 1",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4.1",
                                                      "businfo" : "pci@0000:80:04.1",
                                                      "version" : "04",
                                                      "width" : 64,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ioatdma",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "msix" : "MSI-X",
                                                        "pciexpress" : "PCI Express",
                                                        "pm" : "Power Management",
                                                        "bus_master" : "bus mastering",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:40",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:80:04.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 2",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4.2",
                                                      "businfo" : "pci@0000:80:04.2",
                                                      "version" : "04",
                                                      "width" : 64,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ioatdma",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "msix" : "MSI-X",
                                                        "pciexpress" : "PCI Express",
                                                        "pm" : "Power Management",
                                                        "bus_master" : "bus mastering",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:41",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:80:04.3",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 3",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4.3",
                                                      "businfo" : "pci@0000:80:04.3",
                                                      "version" : "04",
                                                      "width" : 64,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ioatdma",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "msix" : "MSI-X",
                                                        "pciexpress" : "PCI Express",
                                                        "pm" : "Power Management",
                                                        "bus_master" : "bus mastering",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:42",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:80:04.4",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 4",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4.4",
                                                      "businfo" : "pci@0000:80:04.4",
                                                      "version" : "04",
                                                      "width" : 64,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ioatdma",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "msix" : "MSI-X",
                                                        "pciexpress" : "PCI Express",
                                                        "pm" : "Power Management",
                                                        "bus_master" : "bus mastering",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:43",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:80:04.5",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 5",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4.5",
                                                      "businfo" : "pci@0000:80:04.5",
                                                      "version" : "04",
                                                      "width" : 64,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ioatdma",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "msix" : "MSI-X",
                                                        "pciexpress" : "PCI Express",
                                                        "pm" : "Power Management",
                                                        "bus_master" : "bus mastering",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:44",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:80:04.6",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 6",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4.6",
                                                      "businfo" : "pci@0000:80:04.6",
                                                      "version" : "04",
                                                      "width" : 64,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ioatdma",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "msix" : "MSI-X",
                                                        "pciexpress" : "PCI Express",
                                                        "pm" : "Power Management",
                                                        "bus_master" : "bus mastering",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:45",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:80:04.7",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Crystal Beach DMA Channel 7",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4.7",
                                                      "businfo" : "pci@0000:80:04.7",
                                                      "version" : "04",
                                                      "width" : 64,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ioatdma",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "msix" : "MSI-X",
                                                        "pciexpress" : "PCI Express",
                                                        "pm" : "Power Management",
                                                        "bus_master" : "bus mastering",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:46",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:80:05.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 VTd/Memory Map/Misc",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "5",
                                                      "businfo" : "pci@0000:80:05.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:47",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:80:05.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Memory Hotplug",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "5.1",
                                                      "businfo" : "pci@0000:80:05.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "msi" : "Message Signalled Interrupts",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:48",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:80:05.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 IIO RAS",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "5.2",
                                                      "businfo" : "pci@0000:80:05.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:49",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:80:05.4",
                                                      "description" : "PIC",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 IOAPIC",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "5.4",
                                                      "businfo" : "pci@0000:80:05.4",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "pm" : "Power Management",
                                                        "io_x_-apic" : true,
                                                        "bus_master" : "bus mastering",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:50",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:08.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 QPI Link 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "8",
                                                      "businfo" : "pci@0000:ff:08.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:51",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:09.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 QPI Link 1",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "2f",
                                                      "businfo" : "pci@0000:ff:09.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:52",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0a.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Power Control Unit 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "30",
                                                      "businfo" : "pci@0000:ff:0a.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:53",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0a.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Power Control Unit 1",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "31",
                                                      "businfo" : "pci@0000:ff:0a.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:54",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0a.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Power Control Unit 2",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "32",
                                                      "businfo" : "pci@0000:ff:0a.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:55",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0a.3",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Power Control Unit 3",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "33",
                                                      "businfo" : "pci@0000:ff:0a.3",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:56",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0b.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 UBOX Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "34",
                                                      "businfo" : "pci@0000:ff:0b.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:57",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0b.3",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 UBOX Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "35",
                                                      "businfo" : "pci@0000:ff:0b.3",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:58",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0c.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "36",
                                                      "businfo" : "pci@0000:ff:0c.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:59",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0c.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "37",
                                                      "businfo" : "pci@0000:ff:0c.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:60",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0c.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "38",
                                                      "businfo" : "pci@0000:ff:0c.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:61",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0d.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "39",
                                                      "businfo" : "pci@0000:ff:0d.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:62",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0d.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "3a",
                                                      "businfo" : "pci@0000:ff:0d.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:63",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0d.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Unicast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "3b",
                                                      "businfo" : "pci@0000:ff:0d.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:64",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0e.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Home Agent 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "3c",
                                                      "businfo" : "pci@0000:ff:0e.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:65",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:ff:0e.1",
                                                      "description" : "Performance counters",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Home Agent 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "3d",
                                                      "businfo" : "pci@0000:ff:0e.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:66",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0f.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 Target Address/Thermal Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "3f",
                                                      "businfo" : "pci@0000:ff:0f.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:67",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0f.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 RAS Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "40",
                                                      "businfo" : "pci@0000:ff:0f.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:68",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0f.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 Channel Target Address Decoder Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "41",
                                                      "businfo" : "pci@0000:ff:0f.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:69",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0f.3",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 Channel Target Address Decoder Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "42",
                                                      "businfo" : "pci@0000:ff:0f.3",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:70",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0f.4",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 Channel Target Address Decoder Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "43",
                                                      "businfo" : "pci@0000:ff:0f.4",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:71",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:0f.5",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 0 Channel Target Address Decoder Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "44",
                                                      "businfo" : "pci@0000:ff:0f.5",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:72",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:ff:10.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 Thermal Control 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "45",
                                                      "businfo" : "pci@0000:ff:10.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:73",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:ff:10.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 Thermal Control 1",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "46",
                                                      "businfo" : "pci@0000:ff:10.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:74",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:10.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 ERROR Registers 0",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "47",
                                                      "businfo" : "pci@0000:ff:10.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:75",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:10.3",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 ERROR Registers 1",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "48",
                                                      "businfo" : "pci@0000:ff:10.3",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:76",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:ff:10.4",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 Thermal Control 2",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "49",
                                                      "businfo" : "pci@0000:ff:10.4",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:77",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:ff:10.5",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 Thermal Control 3",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4a",
                                                      "businfo" : "pci@0000:ff:10.5",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:78",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:10.6",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 ERROR Registers 2",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4b",
                                                      "businfo" : "pci@0000:ff:10.6",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:79",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:10.7",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Integrated Memory Controller 1 Channel 0-3 ERROR Registers 3",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4c",
                                                      "businfo" : "pci@0000:ff:10.7",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      },
                                                      "capabilities" : {
                                                        "pciexpress" : "PCI Express",
                                                        "cap_list" : "PCI capabilities listing"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:80",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:13.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 R2PCIe",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4d",
                                                      "businfo" : "pci@0000:ff:13.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:81",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:ff:13.1",
                                                      "description" : "Performance counters",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 R2PCIe",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4e",
                                                      "businfo" : "pci@0000:ff:13.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:82",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:13.4",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 QPI Ring Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "4f",
                                                      "businfo" : "pci@0000:ff:13.4",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:83",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:ff:13.5",
                                                      "description" : "Performance counters",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 QPI Ring Performance Ring Monitoring",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "50",
                                                      "businfo" : "pci@0000:ff:13.5",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:84",
                                                      "class" : "generic",
                                                      "claimed" : true,
                                                      "handle" : "PCI:0000:ff:13.6",
                                                      "description" : "Performance counters",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 QPI Ring Performance Ring Monitoring",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "51",
                                                      "businfo" : "pci@0000:ff:13.6",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "driver" : "ivt_uncore",
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:85",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:16.0",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 System Address Decoder",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "52",
                                                      "businfo" : "pci@0000:ff:16.0",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:86",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:16.1",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Broadcast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "53",
                                                      "businfo" : "pci@0000:ff:16.1",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "generic:87",
                                                      "class" : "generic",
                                                      "handle" : "PCI:0000:ff:16.2",
                                                      "description" : "System peripheral",
                                                      "product" : "Xeon E7 v2/Xeon E5 v2/Core i7 Broadcast Registers",
                                                      "vendor" : "Intel Corporation",
                                                      "physid" : "54",
                                                      "businfo" : "pci@0000:ff:16.2",
                                                      "version" : "04",
                                                      "width" : 32,
                                                      "clock" : 33000000,
                                                      "configuration" : {
                                                        "latency" : "0"
                                                      }
                                                    },
                                                    {
                                                      "id" : "scsi",
                                                      "class" : "storage",
                                                      "claimed" : true,
                                                      "physid" : "55",
                                                      "logicalname" : "scsi2",
                                                      "capabilities" : {
                                                        "emulated" : "Emulated device"
                                                      },
                                                      "children" : [
                                                        {
                                                          "id" : "disk",
                                                          "class" : "disk",
                                                          "claimed" : true,
                                                          "handle" : "SCSI:02:00:00:00",
                                                          "description" : "ATA Disk",
                                                          "product" : "SATADOM-SL 3ME",
                                                          "physid" : "0.0.0",
                                                          "businfo" : "scsi@2:0.0.0",
                                                          "logicalname" : "/dev/sda",
                                                          "dev" : "8:0",
                                                          "version" : "S130",
                                                          "serial" : "20131210AAAA71200050",
                                                          "units" : "bytes",
                                                          "size" : 8012390400,
                                                          "configuration" : {
                                                            "ansiversion" : "5",
                                                            "sectorsize" : "512",
                                                            "signature" : "000464ff"
                                                          },
                                                          "capabilities" : {
                                                            "partitioned" : "Partitioned disk",
                                                            "partitioned:dos" : "MS-DOS partition table"
                                                          },
                                                          "children" : [
                                                            {
                                                              "id" : "volume:0",
                                                              "class" : "volume",
                                                              "claimed" : true,
                                                              "description" : "EXT4 volume",
                                                              "vendor" : "Linux",
                                                              "physid" : "1",
                                                              "businfo" : "scsi@2:0.0.0,1",
                                                              "logicalname" : "/dev/sda1",
                                                              "dev" : "8:1",
                                                              "version" : "1.0",
                                                              "serial" : "b860844c-c9a4-42c4-8960-d868e5883bf8",
                                                              "size" : 524288000,
                                                              "capacity" : 524288000,
                                                              "configuration" : {
                                                                "created" : "2014-08-29 20:06:18",
                                                                "filesystem" : "ext4",
                                                                "lastmountpoint" : "/boot",
                                                                "modified" : "2014-10-16 12:01:45",
                                                                "mounted" : "2014-10-16 12:01:45",
                                                                "state" : "clean"
                                                              },
                                                              "capabilities" : {
                                                                "primary" : "Primary partition",
                                                                "bootable" : "Bootable partition (active)",
                                                                "journaled" : true,
                                                                "extended_attributes" : "Extended Attributes",
                                                                "huge_files" : "16TB+ files",
                                                                "dir_nlink" : "directories with 65000+ subdirs",
                                                                "recover" : "needs recovery",
                                                                "extents" : "extent-based allocation",
                                                                "ext4" : true,
                                                                "ext2" : "EXT2/EXT3",
                                                                "initialized" : "initialized volume"
                                                              }
                                                            },
                                                            {
                                                              "id" : "volume:1",
                                                              "class" : "volume",
                                                              "claimed" : true,
                                                              "description" : "Linux LVM Physical Volume partition",
                                                              "physid" : "2",
                                                              "businfo" : "scsi@2:0.0.0,2",
                                                              "logicalname" : "/dev/sda2",
                                                              "dev" : "8:2",
                                                              "serial" : "1AL24M-ZhIX-ptY8-15TZ-9we5-sWwr-hJqWUU",
                                                              "size" : 7486832640,
                                                              "capacity" : 7486832640,
                                                              "capabilities" : {
                                                                "primary" : "Primary partition",
                                                                "multi" : "Multi-volumes",
                                                                "lvm2" : true
                                                              }
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
    );

module.exports.ipmiSelOutput = '1,05/27/2014,21:20:43,Event Logging Disabled #0x07,Log area reset/cleared,Asserted\n' +
                                   '2,05/27/2014,21:22:20,System Event #0x83,Timestamp Clock Sync,Asserted\n' +
                                   '3,05/27/2014,21:22:21,System Event #0x83,Timestamp Clock Sync,Asserted\n' +
                                   '4,05/27/2014,21:22:21,Power Unit #0x01,Power off/down,Asserted\n' +
                                   '5,05/27/2014,21:23:24,Power Supply #0x51,Power Supply AC lost,Asserted\n' +
                                   '6,05/27/2014,21:23:25,Power Unit #0x02,Fully Redundant,Deasserted\n' +
                                   '7,05/27/2014,21:23:25,Power Unit #0x02,Redundancy Lost,Asserted\n' +
                                   '8,05/27/2014,21:23:25,Power Unit #0x02,Non-Redundant: Sufficient from Redundant,Asserted';


module.exports.ipmiUserListOutput = 'ID,Name,Callin,Link Auth,IPMI Msg Channel,Priv Limit\n' +
                                    '1,,true,false,true,ADMINISTRATOR\n' +
                                    '2,root,false,true,true,ADMINISTRATOR\n';

module.exports.ipmiUserSummaryOutput = 'Maximum IDs	    : 15\n' +
                                       'Enabled User Count  : 2\n' +
                                       'Fixed Name Count    : 2\n';

module.exports.ipmiMcInfoOutput = 'Device ID                 : 33\n' +
                                  'Device Revision           : 1\n' +
                                  'Firmware Revision         : 1.17\n' +
                                  'IPMI Version              : 2.0\n' +
                                  'Manufacturer ID           : 343\n' +
                                  'Manufacturer Name         : Intel Corporation\n' +
                                  'Product ID                : 73 (0x0049)\n' +
                                  'Product Name              : Unknown (0x49)\n' +
                                  'Device Available          : yes\n' +
                                  'Provides Device SDRs      : no\n' +
                                  'Additional Device Support :\n' +
                                  '    Sensor Device\n' +
                                  '    SDR Repository Device\n' +
                                  '    SEL Device\n' +
                                  '    FRU Inventory Device\n' +
                                  '    IPMB Event Receiver\n' +
                                  '    IPMB Event Generator\n' +
                                  '    Chassis Device\n' +
                                  'Aux Firmware Rev Info     :\n' +
                                  '    0x01\n' +
                                  '    0x17\n' +
                                  '    0x37\n' +
                                  '    0x10\n';

module.exports.ipmiLanPrintOutput = 'Set in Progress         : Set Complete\n' +
                                    'Auth Type Support       : NONE MD2 MD5 PASSWORD\n' +
                                    'Auth Type Enable        : Callback : MD2 MD5 PASSWORD\n' +
                                    '                        : User     : MD2 MD5 PASSWORD\n' +
                                    '                        : Operator : MD2 MD5 PASSWORD\n' +
                                    '                        : Admin    : MD2 MD5 PASSWORD\n' +
                                    '                        : OEM      : MD2 MD5 PASSWORD\n' +
                                    'IP Address Source       : DHCP Address\n' +
                                    'IP Address              : 0.0.0.0\n' +
                                    'Subnet Mask             : 0.0.0.0\n' +
                                    'MAC Address             : 00:25:90:83:d4:4c\n' +
                                    'SNMP Community String   : public\n' +
                                    'IP Header               : TTL=0x00 Flags=0x00 Precedence=0x00 TOS=0x00\n' +
                                    'BMC ARP Control         : ARP Responses Enabled, Gratuitous ARP Disabled\n' +
                                    'Default Gateway IP      : 0.0.0.0\n' +
                                    'Default Gateway MAC     : 00:00:00:00:00:00\n' +
                                    'Backup Gateway IP       : 0.0.0.0\n' +
                                    'Backup Gateway MAC      : 00:00:00:00:00:00\n' +
                                    '802.1q VLAN ID          : Disabled\n' +
                                    '802.1q VLAN Priority    : 0\n' +
                                    'RMCP+ Cipher Suites     : 1,2,3,6,7,8,11,12\n' +
                                    'Cipher Suite Priv Max   : aaaaXXaaaXXaaXX\n' +
                                    '                        :     X=Cipher Suite Unused\n' +
                                    '                        :     c=CALLBACK\n' +
                                    '                        :     u=USER\n' +
                                    '                        :     o=OPERATOR\n' +
                                    '                        :     a=ADMIN\n' +
                                    '                        :     O=OEM' +
                                    '';

module.exports.ipmiLanPrintOutputValidIp = 'Set in Progress         : Set Complete\n' +
                                           'Auth Type Support       : NONE MD2 MD5 PASSWORD\n' +
                                           'Auth Type Enable        : Callback : MD2 MD5 PASSWORD\n' +
                                           '                        : User     : MD2 MD5 PASSWORD\n' +
                                           '                        : Operator : MD2 MD5 PASSWORD\n' +
                                           '                        : Admin    : MD2 MD5 PASSWORD\n' +
                                           '                        : OEM      : MD2 MD5 PASSWORD\n' +
                                           'IP Address Source       : Static Address\n' +
                                           'IP Address              : 10.1.1.24\n' +
                                           'Subnet Mask             : 255.255.255.0\n' +
                                           'MAC Address             : 00:25:90:83:d4:4c\n' +
                                           'SNMP Community String   : public\n' +
                                           'IP Header               : TTL=0x00 Flags=0x00 Precedence=0x00 TOS=0x00\n' +
                                           'BMC ARP Control         : ARP Responses Enabled, Gratuitous ARP Disabled\n' +
                                           'Default Gateway IP      : 0.0.0.0\n' +
                                           'Default Gateway MAC     : 00:00:00:00:00:00\n' +
                                           'Backup Gateway IP       : 0.0.0.0\n' +
                                           'Backup Gateway MAC      : 00:00:00:00:00:00\n' +
                                           '802.1q VLAN ID          : Disabled\n' +
                                           '802.1q VLAN Priority    : 0\n' +
                                           'RMCP+ Cipher Suites     : 1,2,3,6,7,8,11,12\n' +
                                           'Cipher Suite Priv Max   : aaaaXXaaaXXaaXX\n' +
                                           '                        :     X=Cipher Suite Unused\n' +
                                           '                        :     c=CALLBACK\n' +
                                           '                        :     u=USER\n' +
                                           '                        :     o=OPERATOR\n' +
                                           '                        :     a=ADMIN\n' +
                                           '                        :     O=OEM' +
                                           '';

module.exports.ipmiLanPrintOutputUnused = 'Set in Progress         : Set Complete\n' +
                                          'Auth Type Support       : NONE MD2 MD5 PASSWORD\n' +
                                          'Auth Type Enable        : Callback : MD2 MD5 PASSWORD\n' +
                                          '                        : User     : MD2 MD5 PASSWORD\n' +
                                          '                        : Operator : MD2 MD5 PASSWORD\n' +
                                          '                        : Admin    : MD2 MD5 PASSWORD\n' +
                                          '                        : OEM      : MD2 MD5 PASSWORD\n' +
                                          'IP Address Source       : DHCP Address\n' +
                                          'IP Address              : 0.0.0.0\n' +
                                          'Subnet Mask             : 0.0.0.0\n' +
                                          'MAC Address             : 00:00:00:00:00:00\n' +
                                          'SNMP Community String   : public\n' +
                                          'IP Header               : TTL=0x00 Flags=0x00 Precedence=0x00 TOS=0x00\n' +
                                          'BMC ARP Control         : ARP Responses Enabled, Gratuitous ARP Disabled\n' +
                                          'Default Gateway IP      : 0.0.0.0\n' +
                                          'Default Gateway MAC     : 00:00:00:00:00:00\n' +
                                          'Backup Gateway IP       : 0.0.0.0\n' +
                                          'Backup Gateway MAC      : 00:00:00:00:00:00\n' +
                                          '802.1q VLAN ID          : Disabled\n' +
                                          '802.1q VLAN Priority    : 0\n' +
                                          'RMCP+ Cipher Suites     : 1,2,3,6,7,8,11,12\n' +
                                          'Cipher Suite Priv Max   : aaaaXXaaaXXaaXX\n' +
                                          '                        :     X=Cipher Suite Unused\n' +
                                          '                        :     c=CALLBACK\n' +
                                          '                        :     u=USER\n' +
                                          '                        :     o=OPERATOR\n' +
                                          '                        :     a=ADMIN\n' +
                                          '                        :     O=OEM' +
                                          '';


module.exports.mellanoxOutput = '<Devices>' +
                                '<Device pciName="/dev/mst/mt4113_pciconf0" type="ConnectIB" psid="MT_1240110019" partNumber="MCB192A-FCA_A1">' +
                                '<Versions>' +
                                '<Fw current="2.11.1258" available="2.30.1560"/>' +
                                '<PXE current="3.4.0142" available="3.4.0142"/>' +
                                '</Versions>' +
                                '<status> Update required </status>' +
                                '<description>Connect-IB Host Channel Adapter; dual-port QSFP; FDR 56Gb/s; PCIe3.0 x8; RoHS R6</description>' +
                                '</Device>' +
                                '<Device pciName="/dev/mst/mt26428_pci_cr0" type="ConnectX2" psid="MT_0D80120009" partNumber="MHQH29B-XTR_A2">' +
                                '<Versions>' +
                                '<Fw current="2.10.0720" available="2.11.0500"/>' +
                                '<PXE current="3.4.0142" available="3.4.0142"/>' +
                                '</Versions>' +
                                '<status> Update required </status>' +
                                '<description>ConnectX-2 VPI adapter card; dual-port; 40Gb/s QSFP; PCIe2.0 x8 5.0GT/s; tall bracket; RoHS R6</description>' +
                                '</Device>' +
                                '</Devices>';

module.exports.storcliControllerCountNoControllers = '{' +
    '"Controllers" : [ ' +
        '{' +
            '"Response Data" : {' +
                '"Controller Count" : 0' +
            '},' +
            '"Command Status" : {' +
                '"Description" : "None",' +
                '"Status" : "Success",' +
                '"Status Code" : 0' +
            '}' +
        '}' +
    ']' +
'}';

module.exports.sas2flashList = '*** *********** **** ***** *******\n' +
                               '******* *********** ************\n' +
                               '********* *** ********* *** ***********. *** ****** ********\n' +
                               '\n' +
                               '	Adapter Selected is a LSI SAS: SAS2008(B2)\n' +
                               '\n' +
                               '	Controller Number              : 0\n' +
                               '	Controller                     : SAS2008(B2)\n' +
                               '	PCI Address                    : 00:83:00:00\n' +
                               '	SAS Address                    : 5001636-0-0142-4e65\n' +
                               '	NVDATA Version (Default)       : 11.00.2b.09\n' +
                               '	NVDATA Version (Persistent)    : 11.00.2b.09\n' +
                               '	Firmware Product ID            : 0x2713\n' +
                               '	Firmware Version               : 17.00.01.00\n' +
                               '	NVDATA Vendor                  : LSI\n' +
                               '	NVDATA Product ID              : Undefined\n' +
                               '	BIOS Version                   : 07.35.00.00\n' +
                               '	UEFI BSD Version               : 07.25.01.00\n' +
                               '	FCODE Version                  : N/A\n' +
                               '	Board Name                     : SAS2 Mezz\n' +
                               '	Board Assembly                 : N/A\n' +
                               '	Board Tracer Number            : N/A\n' +
                               '\n' +
                               '	Finished Processing Commands Successfully.\n' +
                               '	Exiting SAS2Flash.\n' +
                               '\n';

module.exports.racadmJobIdData = 'Security Alert: Certificate is invalid - self signed certificate\n' +
                                'Continuing execution. Use -S option for racadm to stop execution on ' +
                                'certificate-related errors.\n' +
                                'RAC977: Import configuration XML file operation initiated.\n' +
                                'Use the "racadm jobqueue view -i JID_541335487816" command to view the status\n' +
                                'of the operation.\n' +
                                '\n';

module.exports.racadmJobStatusData = 'Security Alert: Certificate is invalid - self signed certificate\n' +
                                    'Continuing execution. Use -S option for racadm to stop ' +
                                    'execution on certificate-related errors.\n' +
                                    '---------------------------- JOB -------------------------\n' +
                                    '[Job ID=JID_541347990377]\n' +
                                    'Job Name=Configure: Import system configuration XML file\n' +
                                    'Status=Completed\n' +
                                    'Start Time=[Not Applicable]\n' +
                                    'Expiration Time=[Not Applicable]\n' +
                                    'Message=[SYS054: No configuration changes requiring a system ' +
                                    'restart need to be applied.]\n' +
                                    'Percent Complete=[100]\n' +
                                    '----------------------------------------------------------\n' +
                                    '\n';


var fs = require('fs');

module.exports.ipAddrLinkOutput = fs
    .readFileSync(__dirname+"/samplefiles/ip_addr_link_output.txt")
    .toString();

module.exports.storcliAdapterInfo = fs
    .readFileSync(__dirname+"/samplefiles/storcli_adapter_info.txt")
    .toString();

module.exports.storcliVirtualDiskInfo = fs
    .readFileSync(__dirname+"/samplefiles/storcli_virtual_disk_info.txt")
    .toString();

module.exports.storcliPhysicalDiskInfo = fs
    .readFileSync(__dirname+"/samplefiles/storcli_physical_disk_info.txt")
    .toString();

module.exports.ipmiSelInformationOutput = fs
    .readFileSync(__dirname+"/samplefiles/ipmi-sel-information.txt")
    .toString();

module.exports.dmidecodeSupermicro = fs
    .readFileSync(__dirname+"/samplefiles/dmidecode-supermicro.txt")
    .toString();

module.exports.dmidecodeQuanta = fs
    .readFileSync(__dirname+"/samplefiles/dmidecode-quanta.txt")
    .toString();

module.exports.testesesQ = fs
    .readFileSync(__dirname+'/samplefiles/test_eses-q-std.xml')
    .toString();

module.exports.testesesR = fs
    .readFileSync(__dirname+'/samplefiles/test_eses-R.xml')
    .toString();

module.exports.testesesE0 = fs
    .readFileSync(__dirname+'/samplefiles/test_eses-e0-gencl.xml')
    .toString();

module.exports.ipmiFru = fs
    .readFileSync(__dirname+"/samplefiles/quanta_fru.txt")
    .toString();

module.exports.smart = fs
	.readFileSync(__dirname+"/samplefiles/smartctrl.txt")
	.toString();

module.exports.flashupdtdecode = fs
    .readFileSync(__dirname+"/samplefiles/flashupdtdecode.txt")
    .toString();

module.exports.snmp = fs
    .readFileSync(__dirname+"/samplefiles/snmp.txt")
    .toString();

module.exports.lldpOutput = fs
    .readFileSync(__dirname+"/samplefiles/lldp.txt")
    .toString();

module.exports.driveidOutput = fs
    .readFileSync(__dirname+"/samplefiles/driveid.txt")
    .toString();

module.exports.lshwOutputMultiNic = fs
    .readFileSync(__dirname+"/samplefiles/multi-nic-lshw.txt")

module.exports.racadmSoftwareInventory = fs
    .readFileSync(__dirname+"/samplefiles/racadm-software-inventory.txt")
    .toString();

module.exports.racadmJobqueueData = fs
    .readFileSync(__dirname+"/samplefiles/racadm-jobqueue-data.txt")
    .toString();
